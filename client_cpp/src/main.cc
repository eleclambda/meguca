#include "../brunhild/init.hh"
#include "../brunhild/mutations.hh"
#include "local_storage.hh"
#include "page/header.hh"
#include "page/navigation.hh"
#include "page/page.hh"
#include "posts/commands.hh"
#include "posts/init.hh"
#include "state.hh"
#include <emscripten.h>

int main()
{
    brunhild::before_flush = &rerender_syncwatches;
    brunhild::init();
    load_state();
    init_posts();
    init_navigation();
    init_top_header();
    brunhild::set_outer_html("threads", (new PageView())->init_as_root());

    // Block all clicks on <a> from exhibiting browser default behavior, unless
    // the user intends to navigate to a new tab or open a browser menu.
    // Also block navigation on form sumbition.
    EM_ASM({
        document.addEventListener('click', function(e) {
            if (e.which != 1 || e.ctrlKey) {
                return;
            }
            var t = e.target;
            switch (t.tagName) {
            case 'A':
                if (t.getAttribute('target') == '_blank'
                    || t.getAttribute('download')) {
                    return;
                }
            case 'IMG':
                e.preventDefault();
            }
        });
        document.addEventListener(
            'submit', function(e) { e.preventDefault(); });
    });

    return 0;
}
