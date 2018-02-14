/* 
 * Code for generating the dynamic UI from the annotation schema in "schema.xml". 
 * Particularly, the content of the <div> tag with id= "annotationButtons" in index.html will be changed. 
 */
function loadXMLDoc(fname)
{
	  var xmlDoc;
	  // code for IE
	  if (window.ActiveXObject)
	  {
	    xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
	  }
	  // code for Mozilla, Firefox, Opera, etc.
	  else if (document.implementation
	  && document.implementation.createDocument)
	  {
	    xmlDoc=document.implementation.createDocument("","",null);
	   }
	  else
	  {
	    alert('Your browser cannot handle this script');
	  }
	xmlDoc.async=false;
	try{
		xmlDoc.load(fname);
	}catch (Err){	//Safari or Chrome: 
		//Read using XMLHttpRequest instead of createDocument() and load()
		var req= new XMLHttpRequest();
		req.open("GET", fname, false);
		req.send(null);
		xmlDoc = req.responseXML.documentElement;
	}
	return(xmlDoc);
}



function readAnnotationTypes()
{
	var xml=loadXMLDoc("schema.xml");
	var xsl=loadXMLDoc("schema2.xsl");
		
	// code for IE
	if (window.ActiveXObject)
	  {
	    var ex=xml.transformNode(xsl).replace(/<\?xml[^>]*?>/ig, ''); //obtain the code but get rid of the xml header
	    document.getElementById("annotationTypes").text=ex;
	    eval(ex);	    
	  }
	  // code for Mozilla, Firefox, Opera, etc.
	  else if (document.implementation
	  && document.implementation.createDocument)
	  {
	    xsltProcessor=new XSLTProcessor();
	    xsltProcessor.importStylesheet(xsl);
	    resultDocument = xsltProcessor.transformToFragment(xml,document);
	    document.getElementById("annotationTypes").appendChild(resultDocument);
	  }
}


function displayAnnotationButtons()
{
	var xml=loadXMLDoc("schema.xml");
	var xsl=loadXMLDoc("schema.xsl");
	// code for IE
	if (window.ActiveXObject)
	  {
	    ex=xml.transformNode(xsl);
	    document.getElementById("annotationButtons").innerHTML=ex;
	  }
	  // code for Mozilla, Firefox, Opera, etc.
	  else if (document.implementation
	  && document.implementation.createDocument)
	  {
	    xsltProcessor=new XSLTProcessor();
	    xsltProcessor.importStylesheet(xsl);
	    resultDocument = xsltProcessor.transformToFragment(xml,document);
	    document.getElementById("annotationButtons").appendChild(resultDocument);
	  }
}

function displayAnnotationQuestions()
{
	var xml=loadXMLDoc("schema.xml");
	var xsl=loadXMLDoc("schema3.xsl");
	// code for IE
	if (window.ActiveXObject)
	  {
	    ex=xml.transformNode(xsl);
	    document.getElementById("annotationQuestions").innerHTML=ex;
	  }
	  // code for Mozilla, Firefox, Opera, etc.
	  else if (document.implementation
	  && document.implementation.createDocument)
	  {
	    xsltProcessor=new XSLTProcessor();
	    xsltProcessor.importStylesheet(xsl);
	    resultDocument = xsltProcessor.transformToFragment(xml,document);
	    document.getElementById("annotationQuestions").appendChild(resultDocument);
	  }
}





