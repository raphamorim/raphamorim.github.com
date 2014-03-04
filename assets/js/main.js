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
 				$(".main").animate({"padding-top": "30px"}, 500, function() {
             $("#bar-mobile-menu").slideUp(500);
         });
 			}
 			else {
 				$(".main").animate({'padding-top': '5px'}, 1000, function() {
             $("#bar-mobile-menu").slideDown(0);
         });
 			}
 		});

});
