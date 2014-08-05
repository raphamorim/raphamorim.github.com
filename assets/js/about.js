$(document).ready(function() {
    var loading = setInterval(function() {
        if (document.readyState === "complete") {
            $(".welcome").fadeOut(600);
            $(".intro").fadeIn(600, function() {
                $(this).animate({
                    marginTop: "60px",
                }, 600);
                $(".nav").css('visibility','visible');
            });
            clearInterval(loading);
        }
    }, 10);
});
