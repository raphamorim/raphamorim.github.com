$(document).ready(function() {
    var loading = setInterval(function() {
        if (document.readyState === "complete") {
            

            clearInterval(loading);
        }
    }, 10);
});
