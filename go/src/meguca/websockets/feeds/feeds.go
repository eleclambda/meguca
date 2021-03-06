// Package feeds manages client synchronization to update feeds and provides a
// thread-safe interface for propagating messages to them and reassigning feeds
// to and from clients.
package feeds

import (
	"errors"
	"meguca/common"
	"sync"
)

// Contains and manages all active update feeds
var feeds = feedMap{
	// 64 len map to avoid some possible reallocation as the server starts
	feeds:   make(map[uint64]*Feed, 64),
	tvFeeds: make(map[string]*tvFeed, 64),
}

// Export without circular dependency
func init() {
	common.SendTo = SendTo
	common.ClosePost = ClosePost
	common.BanPost = BanPost
	common.DeletePost = DeletePost
	common.DeleteImage = DeleteImage
	common.SpoilerImage = SpoilerImage
}

// Container for managing client<->update-feed assignment and interaction
type feedMap struct {
	feeds   map[uint64]*Feed
	tvFeeds map[string]*tvFeed
	mu      sync.RWMutex
}

// Add client to feed and send it the current status of the feed for
// synchronization to the feed's internal state
func addToFeed(id uint64, board string, c common.Client) (
	feed *Feed, err error,
) {
	feeds.mu.Lock()
	defer feeds.mu.Unlock()

	var ok bool

	if id != 0 {
		feed, ok = feeds.feeds[id]
		if !ok {
			feed = &Feed{
				id:              id,
				send:            make(chan []byte),
				insertPost:      make(chan postCreationMessage),
				closePost:       make(chan postCloseMessage),
				sendPostMessage: make(chan postMessage),
				setOpenBody:     make(chan postBodyModMessage),
				insertImage:     make(chan imageInsertionMessage),
				messageBuffer:   make([]string, 0, 64),
			}
			feed.baseFeed.init()
			feeds.feeds[id] = feed
			err = feed.Start()
			if err != nil {
				return
			}
		}
		feed.add <- c
	}

	return
}

// Subscribe to random video stream. Clients are automatically unsubscribed,
// when leaving their current sync feed.
func SubscribeToMeguTV(c common.Client) (err error) {
	feeds.mu.Lock()
	defer feeds.mu.Unlock()

	sync, _, board := GetSync(c)
	if !sync {
		return errors.New("meguTV: not synced")
	}

	tvf, ok := feeds.tvFeeds[board]
	if !ok {
		tvf = &tvFeed{}
		tvf.init()
		feeds.tvFeeds[board] = tvf
		err = tvf.start(board)
		if err != nil {
			return
		}
	}
	tvf.add <- c
	return
}

// Remove client from a subscribed feed
func removeFromFeed(id uint64, board string, c common.Client) {
	feeds.mu.Lock()
	defer feeds.mu.Unlock()

	if feed := feeds.feeds[id]; feed != nil {
		feed.remove <- c
		// If the feeds sends a non-nil, it means it closed
		if nil != <-feed.remove {
			delete(feeds.feeds, feed.id)
		}
	}

	if feed := feeds.tvFeeds[board]; feed != nil {
		feed.remove <- c
		if nil != <-feed.remove {
			delete(feeds.tvFeeds, feed.board)
		}
	}
}

// SendTo sends a message to a feed, if it exists
func SendTo(id uint64, msg []byte) {
	sendIfExists(id, func(f *Feed) {
		f.Send(msg)
	})
}

// Run a send function of a feed, if it exists
func sendIfExists(id uint64, fn func(*Feed)) error {
	feeds.mu.RLock()
	defer feeds.mu.RUnlock()

	if feed := feeds.feeds[id]; feed != nil {
		fn(feed)
	}
	return nil
}

// InsertPostInto inserts a post into a tread feed, if it exists. Only use for
// already closed posts.
func InsertPostInto(post common.StandalonePost, msg []byte) {
	sendIfExists(post.OP, func(f *Feed) {
		f.InsertPost(post, nil, msg)
	})
}

// ClosePost closes a post in a feed, if it exists
func ClosePost(
	id, op uint64,
	links []common.Link,
	commands []common.Command,
	msg []byte,
) {
	sendIfExists(op, func(f *Feed) {
		f.ClosePost(id, links, commands, msg)
	})
}

// Propagate a message about a post being banned
func BanPost(id, op uint64) error {
	msg, err := common.EncodeMessage(common.MessageBanned, id)
	if err != nil {
		return err
	}

	return sendIfExists(op, func(f *Feed) {
		f.banPost(id, msg)
	})
}

// Propagate a message about a post being deleted
func DeletePost(id, op uint64) error {
	msg, err := common.EncodeMessage(common.MessageDeletePost, id)
	if err != nil {
		return err
	}
	return sendIfExists(op, func(f *Feed) {
		f.deletePost(id, msg)
	})
}

// Propagate a message about an image being deleted from a post
func DeleteImage(id, op uint64) error {
	msg, err := common.EncodeMessage(common.MessageDeleteImage, id)
	if err != nil {
		return err
	}
	return sendIfExists(op, func(f *Feed) {
		f.DeleteImage(id, msg)
	})
}

// Propagate a message about an image being spoilered
func SpoilerImage(id, op uint64) error {
	msg, err := common.EncodeMessage(common.MessageSpoiler, id)
	if err != nil {
		return err
	}
	return sendIfExists(op, func(f *Feed) {
		f.SpoilerImage(id, msg)
	})
}

// Remove all existing feeds and clients. Used only in tests.
func Clear() {
	feeds.mu.Lock()
	defer feeds.mu.Unlock()
	feeds.feeds = make(map[uint64]*Feed, 32)
}
