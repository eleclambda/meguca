#pragma once

#include "../../brunhild/node.hh"
#include "../../brunhild/view.hh"
#include <string>

// Render the page, after all the internal state has been loaded
void render_page();

// Format and escape a page title
std::string format_title(const std::string& board, const std::string& text);

// Set's the title of the page. Requires escaping of the string.
void set_title(std::string);

// Push board-specific hover-revealed information elements, if any, to ch.
void push_board_hover_info(brunhild::Children& ch);

// Top banner with a board-specific images
class ImageBanner : public brunhild::View {
    brunhild::Node render();
};

// Simple header with page title
class PageTitle : public brunhild::View {
    brunhild::Node render();
};

class PageView : public brunhild::CompositeView<> {
public:
    PageView()
        : CompositeView<>("section", "threads")
    {
        PageView::instance = this;
    }

    static inline PageView* instance;

protected:
    std::vector<brunhild::BaseView*> get_list();
};
