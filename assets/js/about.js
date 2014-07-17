$(document).ready(function() {
    var loading = setInterval(function() {
        if (document.readyState === "complete") {
            $(".welcome").text("Raphael Amorim");
            $(".intro").fadeIn(1500);

            clearInterval(loading);
        }
    }, 10);
});
