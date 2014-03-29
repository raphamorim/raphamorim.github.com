$(function() {

 	var url = window.location.pathname,
    urlRegExp = new RegExp(url == '/' ? window.location.origin + '/?$' : url.replace(/\/$/,''));


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
 			if($("#bar-mobile-menu").css("opacity") <= 0) {
         $("#bar-mobile-menu").css('height', '415px');
 				$("#bar-mobile-menu").animate({
             opacity: 1,
             paddingLeft: '0px'
         }, 600);
 			}
 			else {
 				$("#bar-mobile-menu").animate({
           opacity: 0,
           paddingLeft: '1000px'
         }, 600);
         $("#bar-mobile-menu").css('height', '0px');
 			}
 		});

});
