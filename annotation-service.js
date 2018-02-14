/*
 * annotation-service.js
 *
 */
 
SNIPPETS_FOLDER= "./snippets/"; 
ANNOTATIONS_FOLDER = "./annotations/";



/*
 * Initialize the annotation service
 */
function AnnotationService()
{
	this.current_id = 1000; 
	return this;
}

/*
 * Fetch the next snippet to annotate from the server
 */
AnnotationService.prototype.listAnnotations = function (xmlText, f )
{
	//1st XMLHTTP Request to retreive the name of the next snippet to annotate: (the snippet that follows  id_current_snippet in the list of snippets stored in the server)
	var url1 = 'fetch_snippet.cgi';

	var xmlobject;
	if (window.ActiveXObject){
		xmlobject = new ActiveXObject("Microsoft.XMLDOM");
		xmlobject.async="false";
		xmlobject.loadXML(xmlText);
	}else{
		xmlobject = (new DOMParser()).parseFromString(xmlText, "text/xml");
	}

	var xmlhttp1 = createAjaxRequest( );
	xmlhttp1.open( 'POST', url1, true);
	xmlhttp1.onreadystatechange = function( ) {
		if ( 4 == xmlhttp1.readyState ) {

			if(xmlhttp1.status==200) {

				var dir_name = xmlhttp1.responseXML.getElementsByTagName("dir")[0].firstChild.nodeValue;
				var file_name = xmlhttp1.responseXML.getElementsByTagName("file")[0].firstChild.nodeValue;

				//2nd . Now that I have a dir_name and a file_name, it's time to retreive the snippet (and its initial annotations) stored in that file
				var xmlhttp = createAjaxRequest( );
				xmlhttp.open( 'GET', SNIPPETS_FOLDER+dir_name+"/"+file_name );
				xmlhttp.onreadystatechange = function() {
					if ( 4 == xmlhttp.readyState ) {
						if ( 200 == xmlhttp.status ) {
							if ( null != f )
							{
								f( ANNOTATIONS_FOLDER+dir_name+"/"+file_name, xmlhttp.responseXML );
							}
						}
						else {
							logError( "AnnotationService.listAnnotations failed with code " + xmlhttp.status );
						}
						xmlhttp = null;
					}
				}
				trace( 'annotation-service', "AnnotationService.listAnnotations " + SNIPPETS_FOLDER+this.dir_name+"/"+this.file_name)
				xmlhttp.send( null );

			}else{
				//f (null, null);
				window.location = './thanks.html';
			}
			xmlhttp1 = null;
		}
	}

	xmlhttp1.send (xmlobject);	//send the userId and the id of the last annotated snippet, or -1 if the annotation just started.

	
}

/*
 * Create an annotation on the server
 */
AnnotationService.prototype.createAnnotation = function( snippetId, XMLText )
{
	
	var url = 'save.cgi';

	var xmlobject;
	if (window.ActiveXObject){
		xmlobject = new ActiveXObject("Microsoft.XMLDOM");
		xmlobject.async="false";
		xmlobject.loadXML(XMLText);
	}else{
		xmlobject = (new DOMParser()).parseFromString(XMLText, "text/xml");
	}
	
	var xmlhttp2 = createAjaxRequest( );
	xmlhttp2.open( 'POST', url, false);

	xmlhttp2.onreadystatechange = function( ) {
		if ( 4 == xmlhttp2.readyState ) {
				
			if(xmlhttp2.status!=200) {
				alert("There was a problem saving the XML data:\n" +xmlhttp2.status);
				logError( "AnnotationService.createAnnotation failed with code " + xmlhttp2.status );
			}
			xmlhttp2 = null;
		}
		
	}

	xmlhttp2.send (xmlobject);						//send the annotations
}



