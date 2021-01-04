// Define Actual Nav
var __defineActualNav = function(sel) {
  var url = window.location.pathname,
    urlRegExp = new RegExp(url == '/' ? window.location.origin + '/?$' : url.replace(/\/$/, '')),
    navs = document.querySelectorAll(sel),
    items = Array.apply(null, {
      length: navs.length
    }).map(Number.call, Number);

  items.forEach(function(i) {
    if (urlRegExp.test(navs[i].href.replace(/\/$/, '')))
      navs[i].classList.add('active');
  });
};

// Events Mobile Button (generates menu)
var __mobileBtn = function() {
  var navToggle = document.querySelector('.nav-toggle'),
    mobileMenu = document.querySelector('#bar-mobile-menu');

  navToggle.addEventListener('click', function(e) {
    this.classList.toggle("active");

    if (mobileMenu.style.opacity <= 0) {
      mobileMenu.style.opacity = 1;
      mobileMenu.style.height = "430px";
    } else {
      mobileMenu.style.opacity = 0;
      mobileMenu.style.height = "0px";
    }
    e.preventDefault();
  });
};


// MAIN
(function main() {
  __defineActualNav('.pagenav a');
  __mobileBtn();
})();
