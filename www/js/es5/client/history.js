"use strict";System.register([],function(e,t){function n(e,t){var n=l.read(e);if(!i.isMatch(l.page.attributes,n)){o.request("connection:lock"),t&&t.preventDefault();var s=e.split("#"),h=s[0]+(/\?/.test(s[0])?"&":"?")+"minimal=true";1!==s.length&&(h+="#"+s[1]),u.show();var d=new XMLHttpRequest;d.open("GET",h),d.onload=function(){return 200!==this.status?(u.hide(),alert(this.status)):(r(e)!==r(this.responseURL)&&(n=l.read(this.responseURL)),o.request("postSM:feed","done"),o.trigger("state:clear"),o.$threads[0].innerHTML=this.response,l.page.set(n),o.oneeSama.op=n.thread,new c(n.catalog),n.catalog||o.request("connection:unlock",[a.RESYNC,n.board,l.syncs,n.live]),t&&(history.pushState(null,null,n.href),location.hash?o.request("scroll:aboveBanner"):window.scrollTo(0,0)),void u.hide())},d.send()}}function r(e){return e.split(/[\?#]/)[0]}var o,s,i,a,c,l,u;return{setters:[],execute:function(){o=require("./main"),s=o.$,i=o._,a=o.common,c=o.Extract,l=o.state,o.$doc.on("click","a.history",function(e){e.ctrlKey||n(this.href,e)}),u=s("#loadingImage"),o.reply("loading:show",function(){return u.show()}),o.reply("loading:hide",function(){return u.hide()}),window.onpopstate=function(e){n(e.target.location.href),o.request("scroll:aboveBanner")}}}});
//# sourceMappingURL=../maps/client/history.js.map