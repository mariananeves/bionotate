// LabelMe (http://labelme.csail.mit.edu/) functions for managing user ID

var bname;
var bversion;
var wait_for_input;
var edit_popup_open;
var username = 'anonymous';
var username_flag = 0;




function GetBrowserInfo() {
  bname = navigator.appName;
  if(IsMicrosoft()) {
    var arVersion = navigator.appVersion.split("MSIE");
    bversion = parseFloat(arVersion[1]);
  }
  else if(IsNetscape() || IsSafari()) {
    bversion = parseInt(navigator.appVersion);
    //check for Safari.  
    if(navigator.userAgent.match('Safari')) bname = 'Safari';
  }
  else bversion = 0;
}



function RemoveSpecialChars(str) {
  var re = /\$|@|#|~|`|\%|\*|\^|\&|\+|\=|\[|\]|\}|\{|\;|\:|\'|\"|\<|\>|\?|\||\\|\!|\$/g;
  return str.replace(re,"_");
}

function WaitForInput() {
  alert("Need to enter object name.");
}

// Return true if the username is "anonymous".
function IsUserAnonymous() {
  return (username=='anonymous');
}


function InsertAfterDiv(html_str,tag_id) {
  var elt = document.getElementById(tag_id);
  if(IsNetscape() || IsSafari()) {
    var x = document.createRange();
    x.setStartAfter(elt);
//    x.setStartBefore(elt);
    x = x.createContextualFragment(html_str);
    elt.appendChild(x);
  }
  else if(IsMicrosoft()) {
    elt.insertAdjacentHTML("BeforeEnd",html_str);
//     elt.insertAdjacentHTML("AfterEnd",html_str);
  }
  else {
    alert("Sorry, this browser type not yet supported.");
  }

	
}



function IsNetscape() {
  return (bname.indexOf("Netscape")!=-1);
}

function IsMicrosoft() {
  return (bname.indexOf("Microsoft")!=-1);
}

function IsSafari() {
  return (bname.indexOf("Safari")!=-1);
}


function getCookie(c_name) {
  if (document.cookie.length>0) { 
    c_start=document.cookie.indexOf(c_name + "=");
    if (c_start!=-1) { 
      c_start=c_start + c_name.length+1;
      c_end=document.cookie.indexOf(";",c_start);
      if (c_end==-1) c_end=document.cookie.length;
      return unescape(document.cookie.substring(c_start,c_end));
    } 
  }
  return null
}


function setCookie(c_name,value,expiredays) {
  var exdate=new Date();
  exdate.setDate(expiredays);
  document.cookie=c_name+ "=" +escape(value)+
    ((expiredays==null) ? "" : "; expires="+exdate);
}


function PlaceSignInHTML() {
  if(IsMicrosoft()) {
    var html_str = '<div id="you_are_div"><a href="javascript:get_username_form()">' +
      '<font size="3"><b>Sign in</b></font></a> (<a href="why_signin.html" target="_blank">why?</a>)</div>';
    InsertAfterDiv(html_str,'username_main_div');
  }
  else {
    var el_div = document.createElementNS(xhtmlNS,'div');
    el_div.setAttributeNS(null,"id","you_are_div");
    document.getElementById('username_main_div').appendChild(el_div);

    var el_a1 = document.createElementNS(xhtmlNS,'a');
    el_a1.setAttributeNS(null,"href","javascript:get_username_form();");
    el_div.appendChild(el_a1);

    var el_font = document.createElementNS(xhtmlNS,'font');
    el_font.setAttributeNS(null,"size","3");
    el_a1.appendChild(el_font);

    var el_b = document.createElementNS(xhtmlNS,'b');
    el_font.appendChild(el_b);

    var el_txt1 = document.createTextNode('Sign in');
    el_b.appendChild(el_txt1);

    var el_txt2 = document.createTextNode(' (');
    el_div.appendChild(el_txt2);

    var el_a2 = document.createElementNS(xhtmlNS,'a');
    el_a2.setAttributeNS(null,"href","why_signin.html");
    el_a2.setAttributeNS(null,"target","_blank");
    el_div.appendChild(el_a2);

    var el_txt3 = document.createTextNode('why?');
    el_a2.appendChild(el_txt3);

    var el_txt4 = document.createTextNode(')');
    el_div.appendChild(el_txt4);
  }
}

function sign_out() {
  username_flag = 0;
  username = "anonymous";
  setCookie('username',username);
  var p = document.getElementById('you_are_div');
  p.parentNode.removeChild(p);
  PlaceSignInHTML();
}


function write_username() {
  username_flag = 0;
  var html_str;
  if(getCookie('username')){
    username = getCookie('username');
  }else{
    username = "anonymous";	
  }
  if(username=="anonymous") PlaceSignInHTML();
  else if(IsMicrosoft()) {
    html_str = '<div id="you_are_div"><br />You are: <b>' + username + 
      '</b> <br />(' +
      '<a href="javascript:sign_out()">sign out</a>)</div>';
    InsertAfterDiv(html_str,'username_main_div');
  }
  else {
    var el_div = document.createElementNS(xhtmlNS,'div');
    el_div.setAttributeNS(null,"id","you_are_div");
    document.getElementById('username_main_div').appendChild(el_div);

    var el_br1 = document.createElementNS(xhtmlNS,'br');
    el_div.appendChild(el_br1);

    var el_txt1 = document.createTextNode('You are: ');
    el_div.appendChild(el_txt1);

    var el_b = document.createElementNS(xhtmlNS,'b');
    el_div.appendChild(el_b);

    var el_txt2 = document.createTextNode(username);
    el_b.appendChild(el_txt2);

    var el_br2 = document.createElementNS(xhtmlNS,'br');
    el_div.appendChild(el_br2);

    var el_txt3 = document.createTextNode('(');
    el_div.appendChild(el_txt3);

    var el_a = document.createElementNS(xhtmlNS,'a');
    el_a.setAttributeNS(null,"href","javascript:sign_out()");
    el_div.appendChild(el_a);

    var el_txt4 = document.createTextNode('sign out');
    el_a.appendChild(el_txt4);

    var el_txt5 = document.createTextNode(')');
    el_div.appendChild(el_txt5);
  }
}

function create_username_form() {
  if(IsMicrosoft()) {
    var html_str = '<div id="enter_username_div">' +
      '<form action="javascript:submit_username();" style="margin-bottom:0px;">' +
      '<table style="font-size:small;"><tr><td nowrap>' +
      '<br />Username: '+
      '<input type="text" id="username" name="username" size="20em" '+
      'style="font-family:Arial;font-size:small;" /><br />' +
      '<input id="username_submit" name="username_submit" '+
      'value="Submit" type="submit" ' +
      'style="font-family:Arial;font-size:small;" />' +
      '</td></tr></table></form></div>';
  
    InsertAfterDiv(html_str,'username_main_div');
  }
  else {
    var el_div = document.createElementNS(xhtmlNS,'div');
    el_div.setAttributeNS(null,"id","enter_username_div");
    document.getElementById('username_main_div').appendChild(el_div);

    var el_form = document.createElementNS(xhtmlNS,'form');
    el_form.setAttributeNS(null,"action","javascript:submit_username();");
    el_form.setAttributeNS(null,"style","margin-bottom:0px;");
    el_div.appendChild(el_form);

    var el_table = document.createElementNS(xhtmlNS,'table');
    el_table.setAttributeNS(null,"style","font-size:small;");
    el_form.appendChild(el_table);

    var el_tr = document.createElementNS(xhtmlNS,'tr');
    el_table.appendChild(el_tr);

    var el_td = document.createElementNS(xhtmlNS,'td');
    el_tr.appendChild(el_td);

    var el_br1 = document.createElementNS(xhtmlNS,'br');
    el_td.appendChild(el_br1);

    var el_txt1 = document.createTextNode('Username: ');
    el_td.appendChild(el_txt1);

    var el_input1 = document.createElementNS(xhtmlNS,'input');
    el_input1.setAttributeNS(null,"type","text");
    el_input1.setAttributeNS(null,"id","username");
    el_input1.setAttributeNS(null,"name","username");
    el_input1.setAttributeNS(null,"size","20em");
    el_input1.setAttributeNS(null,"style","font-family:Arial;font-size:small;");
    el_td.appendChild(el_input1);

    var el_br2 = document.createElementNS(xhtmlNS,'br');
    el_td.appendChild(el_br2);

    var el_input2 = document.createElementNS(xhtmlNS,'input');
    el_input2.setAttributeNS(null,"type","submit");
    el_input2.setAttributeNS(null,"id","username_submit");
    el_input2.setAttributeNS(null,"name","username_submit");
    el_input2.setAttributeNS(null,"value","Submit");
    el_input2.setAttributeNS(null,"style","font-family:Arial;font-size:small;");
    el_td.appendChild(el_input2);
  }
}

function submit_username() {
  username = document.getElementById('username').value;
  username = RemoveSpecialChars(username);
  if(username.length==0) username = 'anonymous';
  setCookie('username',username);
  var p = document.getElementById('enter_username_div');
  p.parentNode.removeChild(p);
  write_username();
}


function get_username_form() {
  if(wait_for_input) return WaitForInput();
  if(edit_popup_open) main_handler.SelectedToRest();
  username_flag = 1;
  var p = document.getElementById('you_are_div');
  p.parentNode.removeChild(p);
  create_username_form();

  document.getElementById('username').value = username;
  document.getElementById('username').select();
}


