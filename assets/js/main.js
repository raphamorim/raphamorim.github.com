$(function() {

 	var url = window.location.pathname
      , urlRegExp = new RegExp(url == '/' ? window.location.origin + '/?$' : url.replace(/\/$/,''));


 	$('#pagenav a')
 		.each(function(){
    	  	if(urlRegExp.test(this.href.replace(/\/$/,''))){
        		  $(this).addClass('active');
      		}
  		});

  	$('#bar-mobile-menu a')
  		.each(function(){
    	  	if(urlRegExp.test(this.href.replace(/\/$/,''))){
        		  $(this).addClass('active');
      		}
  		});

 	$('.bar-menu-optional')
 		.click(function(){
 			if($("#bar-mobile-menu").is(":visible")) {
 				$("#bar-mobile-menu").slideUp(500);
 				$(".main").css("padding-top", "30px");
 			}
 			else {
 				$("#bar-mobile-menu").slideDown(500);
 				$(".main").css("padding-top", "5px");
 			}
 		});

});