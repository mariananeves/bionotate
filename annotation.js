/*
 * annotation.js
 *
 */

// namespaces
NS_ATOM = 'http://www.w3.org/2005/Atom';

// The names of HTML/CSS classes used by the annotation code.
AN_TEXT_AREA_CLASS = 'articles';
AN_NOTES_CLASS = 'notes';			// the notes portion of a fragment
AN_ENTITYLIST_CLASS = 'entityList';
AN_HIGHLIGHT_CLASS_ANNOTATION = 'annotation'
AN_HOVER_CLASS = 'hover';			// assigned to highlights and notes when the mouse is over the other
AN_DUMMY_CLASS = 'dummy';			// used for dummy item in note list
AN_RANGEMISMATCH_ERROR_CLASS = 'annotation-range-mismatch';	// one or more annotations don't match the current state of the document
AN_ID_PREFIX = 'a';					// prefix for annotation IDs in element classes and IDs

// Length limits
MAX_QUOTE_LENGTH = 1000;
MAX_NOTE_LENGTH = 250;

/*
 * Must be called before any other annotation functions
 * thisuser - the current user
 * urlBase - if null, annotation URLs are used as normal.  Otherwise, they are searched for this
 * string and anything preceeding it is chopped off.  This is necessary because IE lies about
 * hrefs:  it provides an absolute URL for that attribute, rather than the actual text.  In some
 * cases, absolute URLs aren't desirable (e.g. because the annotated resources might be moved
 * to another host, in which case the URLs would all break).
 */
function annotationInit( thisuser, urlBase )
{
	window.annotationUrlBase = urlBase;
	window.annotationService = new AnnotationService();
	window.annotationThisUser = thisuser;

	// Event handlers
	if ( document.addEventListener )
		document.addEventListener( 'keyup', _keyupCreateAnnotation, false );
	else  // for IE:
	{
		if ( document.onkeyup )
			document.onkeyup = function( event ) { _keyupCreateAnnotation(event); document.onkeyup; }
		else
			document.onkeyup = _keyupCreateAnnotation;
	}
	
}

/*
 * Get the list of notes.  It is a DOM element containing children,
 * each of which has an annotation field referencing an annotation.
 * There is a dummy first child because of spacing problems in IE.
 */
PostMicro.prototype.getNotesElement = function( )
{
	// Make sure it has the additional annotation properties added
	if ( ! this.notesElement )
	{
		var t = getChildByTagClass( this.element, null, AN_NOTES_CLASS, _skipPostContent );
		this.notesElement = t.getElementsByTagName( 'ol' )[ 0 ];
	}
	return this.notesElement;
}


/*
 * Parse Atom containing annotation info and return an array (results) with the snippet (pos 0) and an array of annotation objects (pos 1)
 */

function parseAnnotationXml( xmlDoc )
{
	var results = new Array ();		//Array of 2 components: 0-->snippet object | 1--> array of annotation objects
	var annotations = new Array( );
	if ( xmlDoc.documentElement.tagName == "error" )
	{
		logError( "parseAnnotationXML Error: " + xmlDoc.documentElement.textValue() );
		alert( getLocalized( 'corrupt XML from service' ) );
		return null;
	}
	else
	{	// Create a Snippet object with the information from the XML file 
		var snippet = new Snippet (xmlDoc);
		if (!snippet)
			return null;
		
		
		// If there are initial annotations, parse them and create as many Annotation objects as needed. 
		readAnnotations(xmlDoc, annotations, snippet);


		results[0] = snippet;
		results[1] = annotations;
		return results;
	}
}


/* ************************ Add/Show Functions ************************ */
/* These are for adding an annotation to the post and display.
 * addAnnotation calls the other three in order:
 * showNote, highlightRange, positionNote
 * None of these do anything with the server, but they do create interface
 * elements which when activated call server functions.
 *
 * In order to achieve a single point of truth, the only annotation list
 * is the list of annotation notes attached to each post in the DOM.
 */

/*
 * Get the index where an annotation is or where it would display
 */
PostMicro.prototype.getAnnotationIndex = function( annotation )
{
	var notesElement = this.getNotesElement( );
	// Go from last to first, on the assumption that this function will be called repeatedly
	// in order.  Calling in reverse order gives worst-case scenario O(n^2) behavior.
	// Don't forget the first node in the list is a dummy with no annotation.
	var pos = notesElement.childNodes.length;
	for ( var note = notesElement.lastChild;  null != note;  note = note.previousSibling )
	{
		--pos;
		if ( null != note.annotation )
		{
			if ( note.annotation.id == annotation.id )
				return pos;
			else if ( compareAnnotationRanges( note.annotation, annotation ) < 0 )
				break;
		}
	}
	return pos;
}

/*
 * Add an annotation to the local annotation list and display.
 * Input: object of type Annotation (see definition at the end of this script)
 */
PostMicro.prototype.addAnnotation = function( annotation ) 
{
	var pos = this.getAnnotationIndex( annotation );
	//alert ("pos for note: "+annotation.id+ " is : "+pos)
	if ( ! this.showHighlight( annotation ) )
		return -1;
	this.showNote( pos, annotation );
	return pos;
}

/*
 * Create an item in the notes list
 * pos - the position in the list
 * annotation - the annotation
 */
PostMicro.prototype.showNote = function( pos, annotation )
{
	
	var noteList = this.getNotesElement();

	// Ensure we have a dummy first sibling
	if ( null == noteList.firstChild )
	{
		var dummy = document.createElement( 'li' );
		dummy.setAttribute( 'class', AN_DUMMY_CLASS );
		dummy.setAttribute( 'className', AN_DUMMY_CLASS );	//IE
		noteList.appendChild( dummy );
	}
	
	// Find the notes that will precede and follow this one
	var prevNode = noteList.firstChild; // the dummy first node
	var nextNode = noteList.firstChild.nextSibling; // skip dummy first node
	for ( var j = 0;  j < pos && null != nextNode;  ++j )
	{
		prevNode = nextNode;
		nextNode = nextNode.nextSibling;
	}

	// Create the list item
	var postMicro = this;
	var noteElement = document.createElement( 'li' );
	noteElement.id = AN_ID_PREFIX + annotation.id;
	noteElement.annotationId = annotation.id;
	noteElement.annotation = annotation;
	
	// Create its contents
	// add the delete button
	var buttonNode = document.createElement( "button" );
	buttonNode.setAttribute( 'type', "button" );
	buttonNode.className = 'annotation-delete';
	buttonNode.setAttribute( 'title', getLocalized( 'delete annotation button' ) );
	buttonNode.appendChild( document.createTextNode( "x" ) );
	buttonNode.annotationId = annotation.id;
	buttonNode.onclick = _deleteAnnotation;
	noteElement.appendChild( buttonNode );
	// Add edit and hover behaviors
	noteElement.onmouseover = _hoverAnnotation;
	noteElement.onmouseout = _unhoverAnnotation;

	// add the text content
	//noteElement.appendChild( document.createTextNode( annotation.note ) );
	noteElement.appendChild (createText4Annotation (annotation.type.caption, annotation.quote));

	var highlightElement = getChildByTagClass( this.contentElement, 'em', AN_ID_PREFIX + annotation.id, null );
	noteElement.style.marginTop = '' + this.calculateNotePushdown( prevNode, highlightElement ) + 'px';
	
	// Insert the note in the list
	noteList.insertBefore( noteElement, nextNode );
	
	return noteElement;
}

/* Create the text in the margin with the annotationType and (part of) the highlighted text
*/
function createText4Annotation (annotationTypeCaption, annotationText){
	if (annotationText.length >=20)
		annotationText = annotationText.substring(0,19)+'...';
	return document.createTextNode(annotationTypeCaption+': '+annotationText);	
}

/*
 * Display a single highlighted range
 * Inserts em tags of class annotation were appropriate
 * Input: object of type Annotation (see definition at the end of this script)
 */
PostMicro.prototype.showHighlight = function( annotation )
{
	var textRange = wordRangeToTextRange( annotation.range, annotation.post.contentElement, _skipSmartcopy );
	// Check whether the content of the text range matches what the annotation expects
	if ( null == textRange )
	{
		trace( 'find-quote', 'Annotation ' + annotation.id + ' not within the content area.' );
		return false;
	}
	var actual = getTextRangeContent( textRange, _skipSmartcopy );
	var quote = annotation.quote;
	actual = actual.replace( /\s|\u00a0\s*/g, ' ' );
	quote = quote.replace( /\s|\u00a0\s*/g, ' ' );
	if ( actual != quote )
	{
		trace( 'find-quote', 'Annotation ' + annotation.id + ' range \"' + actual + '\" doesn\'t match "' + quote + '"' );
		return false;
	}
	var nrange = NormalizedRange( textRange, this.contentElement, _skipSmartcopy );
	this.showHighlight_Recurse( annotation, this.contentElement, nrange, 0 );
	trace( 'find-quote', 'Annotation ' + annotation.id + ' range found.' );
	return true;
}

PostMicro.prototype.showHighlight_Recurse = function( annotation, node, textRange, position )
{
	var start = textRange.offset;
	var end = textRange.offset + textRange.length;

	// if we've completed all our markup, finish
	if ( position > end )
		return 0;		// what a hack!  usually returns the length, but this time returns a node!
	
	if ( node.nodeType == ELEMENT_NODE )
	{
		if ( hasClass( node, 'smart-copy' ) )
			return 0;	// don't include temporary smartcopy content in count
		else
		{
			var children = new Array();
			var length = 0;
			for ( var i = 0;  i < node.childNodes.length;  ++i )
				children[ i ] = node.childNodes[ i ];
			for ( var i = 0;  i < children.length;  ++i )
				length += this.showHighlight_Recurse( annotation, children[ i ], textRange, position + length );
			return length;
		}
	}
	else if ( node.nodeType == TEXT_NODE || node.nodeType == CDATA_SECTION_NODE )
	{
		var length = node.length;
		var newNode;
		if ( start < position + length )
		{
			// Is <em> valid in this position in the document?  (It might well not be if
			// this is a script or style element, or if this is whitespace text in
			// certain other nodes (ul, ol, table, tr, etc.))
			if ( isValidHtmlContent( node.parentNode.tagName, 'em' ) )
			{
				var a = start < position ? 0 : start - position;
				var b = end > position + length ? length : end - position;
				var text = node.nodeValue + "";
				// break the portion of the node before the annotation off and insert it
				if ( a > 0 )
				{
					newNode = document.createTextNode( text.substring( 0, a ) );
					node.parentNode.insertBefore( newNode, node );
				}
				// replace node content with annotation
				newNode = document.createElement( 'em' );
				newNode.className = AN_HIGHLIGHT_CLASS_ANNOTATION + ' '+ annotation.type.name+ ' ' + AN_ID_PREFIX + annotation.id;
				newNode.setAttribute ('class',newNode.className );
				newNode.setAttribute ('className',newNode.className );	//IE
				newNode.setAttribute ('color', annotation.type.color); 
				
				newNode.onmouseover = _hoverAnnotation;
				newNode.onmouseout = _unhoverAnnotation;
				newNode.annotation = annotation;
				node.parentNode.replaceChild( newNode, node );
				newNode.appendChild( node );
				node.nodeValue = text.substring( a, b );
				node = newNode;	// necessary for the next bit to work right
				// break the portion of the node after the annotation off and insert it
				if ( b < length )
				{
					newNode = document.createTextNode( text.substring( b ) );
					if ( node.nextSibling )
						node.parentNode.insertBefore( newNode, node.nextSibling );
					else
						node.parentNode.appendChild( newNode );
				}
			}
		}
		else
		{
			trace( 'highlighting', "Don't draw <em> within <" + node.parentNode.tagName + ">: " + node.nodeValue );
		}
		return length;
	}
	else
		return 0;
}

/*
 * Position the notes for an annotation next to the highlight
 * It is not necessary to call this method when creating notes, only when the positions of
 * existing notes are changing
 */
PostMicro.prototype.positionNote = function( annotation )
{
	var note = document.getElementById( AN_ID_PREFIX + annotation.id );
	while ( null != note )
	{
		var highlight = getChildByTagClass( this.contentElement, 'em', AN_ID_PREFIX + annotation.id, null );
		if ( null == highlight || null == note )
			logError( "positionNote:  Couldn't find note or highlight for " + AN_ID_PREFIX + annotation.id );
		else
			note.style.marginTop = '' + this.calculateNotePushdown( note.previousSibling, highlight );
		note = note.nextSibling;
	}
}

/*
 * Calculate the pixel offset from the previous displayed note to this one
 * by setting the top margin to the appropriate number of pixels.
 * The previous note and the highlight must already be displayed, but this note
 * does not yet need to be part of the DOM.
 */
PostMicro.prototype.calculateNotePushdown = function( previousNoteElement, highlightElement )
{
	var noteY = getElementYOffset( previousNoteElement, null ) + previousNoteElement.offsetHeight;
	var highlightY = getElementYOffset( highlightElement, null );
	highlightElement.border = 'red 1px solid';
	trace( 'align-notes', 'calculateNotePushdown for ' + getNodeText( highlightElement ) + ' (' + highlightElement.className + ') : highlightY=' + highlightY + ', noteY=' + noteY );
	return ( noteY < highlightY ) ? highlightY - noteY : 0;
}

/*
 * Reposition notes, starting with the note list element passed in
 */
PostMicro.prototype.repositionNotes = function( element )
{
	// We don't want the browser to scroll, which it might under some circumstances
	// (I believe it's a timing thing)
	for ( ;  null != element;  element = element.nextSibling )
	{
		var highlightElement = getChildByTagClass( this.contentElement, null, AN_ID_PREFIX + element.annotation.id, null );
		element.style.marginTop = '' + this.calculateNotePushdown( element.previousSibling, highlightElement ) + 'px';
	}
}

/* ************************ Remove/Hide Functions ************************ */
/* These are counterparts to the add/show functions above */

/*
 * Remove all annotations from a post
 * Returns an array of removed annotations so the caller can destruct them if necessary
 */
PostMicro.prototype.removeAnnotations = function( )
{
	var notesElement = this.getNotesElement( );
	var child = notesElement.firstChild;
	var annotations = new Array( );
	while ( null != child )
	{
		if ( child.annotation )
		{
			annotations[ annotations.length ] = child.annotation;
			child.annotation = null;
		}
		notesElement.removeChild( child );
		child = notesElement.firstChild;
	}
	stripMarkup( this.contentElement, 'em', AN_HIGHLIGHT_CLASS_ANNOTATION );
	portableNormalize( this.contentElement );
	return annotations;
}

/*
 * Remove an individual annotation from a post
 */
PostMicro.prototype.removeAnnotation = function ( annotation )
{
	var next = this.removeNote( annotation );
	this.removeHighlight( annotation );
	return null == next ? null : next.annotation;
}

/*
 * Remove an note from the displayed list
 * Returns the next list item in the list
 */
PostMicro.prototype.removeNote = function( annotation )
{
	var listItem = document.getElementById( AN_ID_PREFIX + annotation.id );
	var next = listItem.nextSibling;
	listItem.parentNode.removeChild( listItem );
	listItem.annotation = null; // dummy item won't have this field
	clearEventHandlers( listItem, true );	
	return next;
}

/*
 * Recursively remove highlight markup
 */
PostMicro.prototype.removeHighlight = function ( annotation )
{
	var contentElement = this.contentElement;
	var highlights = getChildrenByTagClass( contentElement, 'em', AN_ID_PREFIX + annotation.id, null, null );
	for ( var i = 0;  i < highlights.length;  ++i )
		highlights[ i ].annotation = null;
	stripMarkup( contentElement, 'em', AN_ID_PREFIX + annotation.id );
	portableNormalize( contentElement );
}


/* ************************ Display Actions ************************ */
/* These are called by event handlers.  Unlike the handlers, they are
 * not specific to controls or events (they should make no assumptions
 * about the event that triggered them). */

/*
 * Indicate an annotation is under the mouse cursor by lighting up the note and the highlight
 * If flag is false, this will remove the lit-up indication instead.
 */
PostMicro.prototype.hoverAnnotation = function( annotation, flag )
{
	// Activate the note
	var noteNode = document.getElementById( AN_ID_PREFIX + annotation.id );
	if ( flag )
		addClass( noteNode, AN_HOVER_CLASS );
	else
		removeClass( noteNode, AN_HOVER_CLASS );

	// Activate the highlighted areas
	var highlights;
	// Retrieve all annotations of the same type
	highlights = getChildrenByTagClass( this.contentElement, null, annotation.type.name, null, null );

	for ( var i = 0;  i < highlights.length;  ++i )
	{
		var node = highlights[ i ];
		// Need to change to upper case in case this is HTML rather than XHTML
		if ( node.tagName.toUpperCase( ) == 'EM' && node.annotation == annotation )
		{
			if ( flag )
				addClass( node, AN_HOVER_CLASS );
			else
				removeClass( node, AN_HOVER_CLASS );
		}
	}
}

/*
 * Called to create a new annotation. 
 * Input: object of type Annotation (see definition at the end of this script)
 */
PostMicro.prototype.createAnnotation = function( annotation )
{
	// Ensure the window doesn't scroll by saving and restoring scroll position
	var scrollY = getWindowYScroll( );
	var scrollX = getWindowXScroll( );

	// Show the annotation and highlight
	this.addAnnotation( annotation );

	// Focus on the text edit
	var noteElement = document.getElementById( AN_ID_PREFIX + annotation.id );
	this.repositionNotes( noteElement.nextSibling );
	
	window.scrollTo( scrollX, scrollY );

}



/*
 * Delete an annotation
 */
PostMicro.prototype.deleteAnnotation = function( annotation )
{
	// Ensure the window doesn't scroll by saving and restoring scroll position
	var scrollY = getWindowYScroll( );
	var scrollX = getWindowXScroll( );

	// Find the annotation
	var next = this.removeAnnotation( annotation );
	if ( null != next )
	{
		var nextElement = document.getElementById( AN_ID_PREFIX + next.id );
		this.repositionNotes( nextElement );
	}
	annotation.destruct( );
	
	window.scrollTo( scrollX, scrollY );
}


/* ************************ Event Handlers ************************ */
/* Each of these should capture an event, obtain the necessary information
 * to execute it, and dispatch it to something else to do the work */

/*
 * Mouse hovers over an annotation note or highlight
 */
function _hoverAnnotation( event )
{
	var post = getNestedFieldValue( this, 'post' );
	if (post == null){
		alert("post == null", post);
	}
	var annotation = getNestedFieldValue( this, 'annotation' );
	if (annotation == null){
		alert("annotation == null", annotation);
	}
	post.hoverAnnotation( annotation, true );
}

/*
 * Mouse hovers off an annotation note or highlight
 */
function _unhoverAnnotation( event )
{
	// IE doesn't have a source node for the event, so use this
	var post = getNestedFieldValue( this, 'post' );
	var annotation = getNestedFieldValue( this, 'annotation' );
	post.hoverAnnotation( annotation, false );
}



/*
 * Click annotation delete button
 */
function _deleteAnnotation( event )
{
	event = getEvent( event );
	stopPropagation( event );
	if ('exploder'==detectBrowser()){	
		event.cancelBubble = true;	//Support for IE
	}
	var post = getNestedFieldValue( this, 'post' );
	var annotation = getNestedFieldValue( this, 'annotation' );
	post.deleteAnnotation( annotation );
}



/*
 * Hit any key in document
 */
function _keyupCreateAnnotation( event )
{
	event = getEvent( event );
	stopPropagation( event );
	if ('exploder'==detectBrowser()){	
		event.cancelBubble = true;	//Support for IE
	}
}



/* ************************ User Functions ************************ */

/*
	show the snippet text and all its annotations
 */
function showAllAnnotations()
{
	// look for the snippet being annotated at the moment
	var postDOM = getChildByTagClass( document.documentElement, null, PM_POST_CLASS, null, _skipPostContent );
	var username = getCookie('username');

	// remove it from the index.html (it was already saved) and show the next snippet to annotate
	if (postDOM != null){
		var postArea = getChildByTagClass( document.documentElement, null, PM_AREA_CLASS, null, _skipPostContent );
		while (postArea.firstChild) {
 			postArea.removeChild(postArea.firstChild);
		}
		// generate the XML request with the Snippet Id and the username
		var XMLText = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns='"+NS_ATOM+"'>\n<link rel='self' type='text/html' href=''/>\n"		
		XMLText += generateXMLNextSnippetRequest (postDOM.id,  username)
		XMLText += "</feed>\n";

		//send the request 
		window.annotationService.listAnnotations( XMLText, _showAllAnnotationsCallback );

	}else{	// or show the first snippet if there are no previous snippets
		
		//First snippet to annotate => load Annotation Types
		loadAnnotationTypes();
		
		// generate the XML request with the Snippet Id and the username
		var XMLText = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns='"+NS_ATOM+"'>\n<link rel='self' type='text/html' href=''/>\n"		
		XMLText += generateXMLNextSnippetRequest (-1,  username)
		XMLText += "</feed>\n";

		//send the request 
		window.annotationService.listAnnotations( XMLText, _showAllAnnotationsCallback );
	}

}


/* 
 * Generates a XML formatted string of text with the information of the last annotated snippet: username, postID
 */
function generateXMLNextSnippetRequest (postId,  username){

	var XMLText = "<username>"+username+"</username>\n";
	XMLText = XMLText+"<id_current_snippet>"+postId+"</id_current_snippet>\n";
	
	return XMLText;
}




function showMessage_noMoreSnippets()
{
	alert ("No more snippets to annotate. Thank you for your contribution to BioNotate.");
}



function _showAllAnnotationsCallback( path, xmldoc )
{
	if (path == null && xmldoc == null){
		showMessage_noMoreSnippets();
	}
	
	var infoXMLFile = parseAnnotationXml( xmldoc );	 	
	if (!infoXMLFile){
		window.location.replace('error.html');
		return
	}
		
	// parseAnnotationXML returns the snippet and the annotations: 
	var snippet = infoXMLFile[0];
	var annotations = infoXMLFile[1];

	// A global variable with the snippet is created. (Needed later when user saves the annotations. )
	window.SNIPPET = snippet;
	
	// 1st: show the snippet:
	//retreive the place in the index.html file where the snippet is going to be introduced
	var postArea = getChildByTagClass( document.documentElement, null, PM_AREA_CLASS, null, _skipPostContent );

	//Create the code for the snippet

	//General information from the snippet (article Id and entities of interest)
	var postInfo = document.createElement ('div');	//postInfo represents the introductory information about the snippet
	postInfo.setAttribute ('class',PM_INFO_CLASS);
	postInfo.setAttribute ('className',PM_INFO_CLASS);	//IE
	var articleSource = snippet.source;
	var articleId = snippet.sourceId;
	postInfo.appendChild(document.createTextNode( "Extracted from article: "+articleSource+" "));
	if (articleSource == "PubMed"){
		postInfo.appendChild(createLink("http://www.ncbi.nlm.nih.gov/pubmed/"+articleId, articleId));
	}else if (articleSource == "OMIM"){	
		postInfo.appendChild(createLink("http://www.ncbi.nlm.nih.gov/entrez/dispomim.cgi?id="+articleId, articleId));
	}else{
		postInfo.appendChild(document.createTextNode (articleId));
	}
	postInfo.appendChild(document.createElement('br'));
	if (snippet.EoIs){
		postInfo.appendChild(document.createTextNode( "Entities of interest:"));		
		var EoI_list = document.createElement('ul');
		for (var i=0; i<snippet.EoIs.length; i++){
			var EoI_entry = document.createElement('li');
			EoI_entry.appendChild(document.createTextNode (snippet.EoIs[i].type.caption+" : "+snippet.EoIs[i].symbol));
			if (snippet.EoIs[i].officialIdType!= null && snippet.EoIs[i].officialIdType == 'Ensembl'){

				var img = new Image();
				img.src = "images/ensembl_logo.gif";
				img.width= "20";
				img.height= "20";
				img.border = "1";
				var img_link = document.createElement('a');
				img_link.href = "http://www.ensembl.org/Homo_sapiens/Transcript/Idhistory/Protein?protein="+snippet.EoIs[i].officialId; 
				
				img_link.appendChild(img);
				EoI_entry.appendChild(img_link);
				
			}
			
			EoI_list.appendChild(EoI_entry);
		}
		postInfo.appendChild(EoI_list);
	}	

	//Text of the snippet and annotation area
	var postDOM = document.createElement ('div');	//postDOM represents the snippet and its annotation area
	postDOM.setAttribute ('class',PM_POST_CLASS);
	postDOM.setAttribute ('className',PM_POST_CLASS);	//IE
	postDOM.setAttribute ('id', snippet.id);
	
	var postLoc = document.createElement('div')
	postLoc.setAttribute('class', 'path')
	postLoc.setAttribute('className', 'path')		//IE
	postLoc.setAttribute('id', path)
	//postLoc.appendChild(document.createElement('br'))

	var postText = document.createElement('div')	//postText represents the text for the snippet
	postText.setAttribute('class', PM_CONTENT_CLASS)
	postText.setAttribute('className', PM_CONTENT_CLASS)	//IE
	postText.appendChild( document.createTextNode( snippet.text ) )

  	var postNotes = document.createElement('div')	//postNotes represents the area on the right for the annotations
	postNotes.setAttribute('class', AN_NOTES_CLASS)
	postNotes.setAttribute('className', AN_NOTES_CLASS)	//IE
	postNotes.appendChild (document.createElement('ol'))
	//put the code for the snippet in the corresponding area
	

	postDOM.appendChild (postText)
	postDOM.appendChild (postNotes)
	postDOM.appendChild (postLoc)
	
	postArea.appendChild(postInfo)
	postArea.appendChild(postDOM)
	
		
	//create a postMicro object which correspond to the DOM post 
	var post = getPostMicro (postDOM)
	var post_info = getChildByTagClass(document.documentElement, null, PM_INFO_CLASS, null, _skipPostContent)

	// 2nd: show the annotations on the snippet:
	// This is the number of annotations that could not be displayed because they don't
	// match the content of the document.
	var annotationErrorCount = 0;

	for ( i = 0;  i < annotations.length;  ++i )
	{	
		annotations[i].post = post;
		if ( -1 == post.addAnnotation( annotations[ i ] ) )
		{
			++annotationErrorCount;
			// Make the error message visible by adding a class which can match a CSS
			// rule to display the error appropriately.
			// This doesn't work on... wait for it... Internet Explorer.  However, I don't
			// want to directly display a specific element or add content, because that
			// would be application-specific.  For now, IE will have to do without.
			addClass( post.element, AN_RANGEMISMATCH_ERROR_CLASS );
		}
	//	}else{
	//		post_info.appendChild(document.createTextNode(" "+annotations[i].quote+" ("+annotations[i].note+")" ));
	//	}
	}
	annotations = null;
}


/*
 * Creates an <a> tag with href pointing to 'destination' and some inner text
 */

function createLink(destination, innerText)
{ 
	var link = document.createElement('a');
	link.href=    destination;
	link.target=  "_blank";
	link.appendChild( document.createTextNode(innerText) );
	return link;
}


/*
 * Hide all annotations on the page
 */
function hideAllAnnotations()
{
	var postElements = getChildrenByTagClass( document.documentElement, null, PM_POST_CLASS, null, _skipPostContent );
	for ( var i = 0;  i < postElements.length;  ++i )
	{
		removeClass( postElements[ i ], AN_RANGEMISMATCH_ERROR_CLASS );
		if ( postElements[ i ].post )
		{
			var annotations = postElements[ i ].post.removeAnnotations( );
			for ( var j = 0;  j < annotations.length;  ++j )
				annotations[ j ].destruct( );
			postElements[ i ] = null;	// prevent IE leaks
		}
	}
}

function _skipSmartCopy( node )
{
	return hasClass( node, 'smart-copy' );
}



/*
 * Create a highlight range based on user selection
 * This is not in the event handler section above because it's up to the calling
 * application to decide what control creates an annotation.  Deletes and edits,
 * on the other hand, are built-in to the note display.
 * Inputs: 
 *   'typeName': name of the Annotation type. Must correspond to a name of a type already available in window.ANNOTATION_TYPES
 */ 
function createAnnotation( postId, typeName, warn )
{
	// Test for selection support (W3C or IE)
	if ( ( ! window.getSelection || null == window.getSelection().rangeCount )
		&& null == document.selection )
	{
		if ( warn )
			alert( getLocalized( 'browser support of W3C range required for annotation creation' ) );
		return false;
	}
		
	var range = getPortableSelectionRange();
	
	if ( null == range || range  == '')
	{
		if ( warn )
			alert( getLocalized( 'select text to annotate' ) );
		return false;
	}
	
	// Check for an annotation with id 0.  If one exists, we can't send another request
	// because the code would get confused by the two ID values coming back.  In that
	// case (hopefully very rare), silently fail.  (I figure the user doesn't want to
	// see an alert pop up, and the natural human instinct would be to try again).
	if ( null != document.getElementById( AN_ID_PREFIX + '0' ) )
		return;
	
	if ( null == postId ){
		var contentElement = getParentByTagClass( range.startContainer, null, PM_CONTENT_CLASS, false, null );
		if ( null == contentElement )
			return false;
		postId = getParentByTagClass( contentElement, null, PM_POST_CLASS, true, _skipPostContent ).id;
	}
	var post = document.getElementById( postId ).post;
	
	// Retrieve id of the last annotation from the list, so the id of the new annotation is : last_id+1
	// Also, using the same loop, count the number of annotations of the same typeName and check that it doesn't exceed type.nOccurrences . 

	var noteList = post.getNotesElement();
	var same_type = 0;		//counter for the number of annotations of the same type already marked up 

	// Find the max id in the noteList
	id_max = 0  
	for ( var node = noteList.firstChild;  node != null; node = node.nextSibling )
	{
		if (node.annotation != null){
			if (node.annotation.id > id_max){
				id_max = node.annotation.id;
			}
			if (node.annotation.type.name == typeName ){
				same_type ++ ;
			}
		}
	}

	// get the AnnotationType object associated to typeName to perform the remaining checks 
	var type = getAnnotationType(typeName);
	
	if (type.nOccurrences>0){	
		if ( same_type >= type.nOccurrences){
			if ( warn )
				alert( 'This snippet already contains '+type.nOccurrences+' '+type.caption+' annotation(s).\n Please remove one existent '+type.caption+' annotation to add a new one.' );
			return false;		
		}
	}

	//set up an internal Annotation object from the selected text including information about the annotation 'type'
	var annotation = annotationFromTextRange( post, range );
	if ( annotation==null ){
		if ( warn )
			alert( getLocalized( 'invalid selection' ) );
		return false;
	}	
	annotation.id = id_max +1;
	annotation.userid = window.annotationService.username;
	annotation.type = type; 
	annotation.isLocal = true;
	annotation.isEditing = false;		

	
	// Check to see whether the quote is too long (don't do this based on the raw text 
	// range because the quote strips leading and trailing spaces)
	if ( annotation.quote.length > MAX_QUOTE_LENGTH )
	{
		annotation.destruct( );
		if ( warn )
			alert( getLocalized( 'quote too long' ) );
		return false;
	}
	
	// The following alert displays the text highlighted and the starting and ending position: 
	// Check out the "Annotation Class" below for a list of atributes of the annotation
	// alert("Selected Text: \""+annotation.quote+"\"\nCoordinates: "+annotation.range);

	// Highlighs the specified text, displays the note in the margin 
	post.createAnnotation( annotation );


	return true;
}


/* Function that retreives the questions asked to the annotator in the current UI and his answers.
	Output: 2-Dim. matrix (Array of Arrays). Each position contains an associative array with keys "name" and "value", corresponding to the 
	question name and the value for the answer, respectively. 
	E.g.: [ ["name":genetics, "value":yes ], [...], ...] 
*/

function getQuestionsAndAnswers (){
	var questions = new Array();
	var annotationQuestions_Node = document.getElementById('annotationQuestions');
	var annotationQuestions_DOM = getChildrenByTagClass( annotationQuestions_Node, 'form', null, null, _skipPostContent ); 
	for ( var i = 0;  i < annotationQuestions_DOM.length;  ++i ){
		var question = new Array();	
		question["name"]= annotationQuestions_DOM[i].name;
		for (var j=0 ; j< annotationQuestions_DOM[i].answer.length; ++j){
			if (annotationQuestions_DOM[i].answer[j].checked == true)
				question["value"]= annotationQuestions_DOM[i].answer[j].value;
		}
		questions[questions.length] = question;
	}
	return questions;	
}



/* Function that sets the default answer for the questions in the UI to the last answer
*/
function setDefaultAnswers (){
	var annotationQuestions_Node = document.getElementById('annotationQuestions');
	var annotationQuestions_DOM = getChildrenByTagClass( annotationQuestions_Node, 'form', null, null, _skipPostContent ); 
	for ( var i = 0;  i < annotationQuestions_DOM.length;  ++i ){
		for (var j=0 ; j< annotationQuestions_DOM[i].answer.length; ++j){
			if (j== annotationQuestions_DOM[i].answer.length-1)
				annotationQuestions_DOM[i].answer[j].checked = true;
			else
				annotationQuestions_DOM[i].answer[j].checked = false;
		}
	}	
}



/* Function that retreives the answers to the questions. 
	Input: - questionName : name(id) of the question to check. This is the name of the form containing the question and answers. 
	Output: - Associative array containing the 'value' for the answer selected by the user. 
*/
/*function getAnswer (questionName){

	var answer = new Array();
	var annotationQuestions_Node = document.getElementById('annotationQuestions');
	var formNode = getChildByTagClass (annotationQuestions_Nodedocument.getElementById(questionName);

	for (i=0; i<formNode.answer.length; i++){
		if (formNode.answer[i].checked ==true){
			answer["value"]= formNode.answer[i].value;
			break;
		}
	}
	return answer; 	
}*/


/* 
 * Saves the annotations performed in the current snippet by the user. 
 * All the information of every annotation is available at the field: "annotation" of the nodes of noteList
 */
function saveAnnotation(warn)
{
	
	var postDOM = getChildByTagClass( document.documentElement, null, PM_POST_CLASS, null, _skipPostContent );
	var post = getPostMicro(postDOM);
	var postId = postDOM.id;
	var username = getCookie('username');
	if (username == null)	username = "anonymous";

	
	//TO-DO: Check if the annotation is complete:
	//checkAnnotation(warn);


	//Create XML annotated snippet
	// 1.- General elements of the snippet: snippetId, source, text, author, EoIs
	var pathSnippet = getChildByTagClass ( postDOM, null, 'path', false, null ).id ;
	var contentElement = getChildByTagClass( postDOM, null, PM_CONTENT_CLASS, false, null );
	var XMLText = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns='"+NS_ATOM+"' >\n<link rel='self' type='text/html' href=''/>\n";
	XMLText += generateXMLSnippet (postId, pathSnippet, username, getNodeText( contentElement), SNIPPET);
	
	// 2.- Annotations performed by the user
	XMLText += "\n<annotations>\n";
	// 2.1.- Answers to the questions
	var questions = getQuestionsAndAnswers();
	for (var i=0 ; i<questions.length; ++i){
		XMLText += "<question>\n<id>"+questions[i]["name"]+"</id>\n<answer>"+questions[i]["value"]+"</answer>\n</question>\n";
	}
	
	// 2.2.- Highlighted text (annotations)
	var noteList = post.getNotesElement();
	for ( var node = noteList.firstChild;  node != null; node = node.nextSibling )
	{
		if (node.annotation != null){
			if (node.annotation.id != 0){
				XMLText += generateXMLAnnotation (node.annotation);
			}
		}
	}
	XMLText += "\n</annotations>\n";
	XMLText += "</feed>\n";

	//send the XML annotated snippet to the server
	window.annotationService.createAnnotation( postId, XMLText );

	//show next snippet
	showAllAnnotations(); 

	// Set default answers to the questions 
	setDefaultAnswers();

	return true;
}

/* 
 * Skips the annotations performed in the current snippet by the user. 
 * Skip really means "save the annotation but with "n/a" as answer for all the questions". 
 */
function skipAnnotation(warn)
{
	
	var postDOM = getChildByTagClass( document.documentElement, null, PM_POST_CLASS, null, _skipPostContent );
	var post = getPostMicro(postDOM);
	var postId = postDOM.id;
	var username = getCookie('username');
	if (username == null)	username = "anonymous";

	//Create XML annotated snippet
	// 1.- General elements of the snippet: snippetId, source, text, author, EoIs
	var pathSnippet = getChildByTagClass ( postDOM, null, 'path', false, null ).id ;
	var contentElement = getChildByTagClass( postDOM, null, PM_CONTENT_CLASS, false, null );
	var XMLText = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<feed xmlns='"+NS_ATOM+"' >\n<link rel='self' type='text/html' href=''/>\n";
	XMLText += generateXMLSnippet (postId, pathSnippet, username, getNodeText( contentElement), SNIPPET);

	// 2.- Annotations performed by the user: N/A for all the questions
	XMLText += "\n<annotations>\n";
	// 2.1.- Answers to the questions
	var questions = getQuestionsAndAnswers();
	for (var i=0 ; i<questions.length; ++i){
		XMLText += "<question>\n<id>"+questions[i]["name"]+"</id>\n<answer>n/a</answer>\n</question>\n";
	}
	XMLText += "\n</annotations>\n";
	XMLText += "</feed>\n";
	
	//send the XML annotated snippet to the server
	window.annotationService.createAnnotation( postId, XMLText );

	//show next snippet
	showAllAnnotations(); 

	// Set default answers to the questions 
	setDefaultAnswers();

	return true;
}



/* 
 * Generates a XML formatted string of text with the information of the already annotated snippet: postID, location in the server, postText and all the information of the snippet in the 'snippet' object
 */
function generateXMLSnippet (postId, pathSnippet, username, postText, snippet){

	var XMLText = "<snippetID>"+postId+"</snippetID>\n"; 
	XMLText += "<source>\n<name>"+snippet.source+"</name>\n<sourceId>"+snippet.sourceId+"</sourceId>\n</source>\n";
	XMLText += "<location>"+pathSnippet+"</location>\n";
	XMLText += "<author>"+username+"</author>\n";
	XMLText += "<text>"+postText+"</text>\n";
	
	if (snippet.EoIs){ 
	
		XMLText += "<EoIs>\n";
		for (var i=0; i<snippet.EoIs.length; ++i){
			XMLText += "<EoI>\n<id>"+snippet.EoIs[i].id+"</id>\n";
			if (snippet.EoIs[i].symbol)			
				XMLText += "<symbol>"+snippet.EoIs[i].symbol+"</symbol>\n"
			if (snippet.EoIs[i].type)
				XMLText += "<type>"+snippet.EoIs[i].type.name+"</type>\n";
			if (snippet.EoIs[i].officialId)
				XMLText += "<officialId type= '"+snippet.EoIs[i].officialIdType+"'>"+snippet.EoIs[i].officialId+"</officialId>\n";
			XMLText += "</EoI>\n";
				
		}
	
		XMLText += "</EoIs>";
	}
	
	return XMLText;
}

/* 
 * Generates a XML-formatted string of text with the information of an annotation
 */
function generateXMLAnnotation (annotation){

	var XMLText = "<entry>\n"; 
	XMLText += "<refId>";
	if (annotation.EoI)
		XMLText += annotation.EoI.id;
	XMLText +="</refId>\n";
	XMLText += "<range>"+annotation.range+"</range>\n";
	XMLText += "<summary>"+annotation.quote+"</summary>\n";
	XMLText += "<type>"+annotation.type.name+"</type>\n";
	XMLText += "</entry>\n";

	return XMLText;
}


/* ************************ Annotation Class ************************ */
/*
 * This is a data-only class with (almost) no methods.  This is because all annotation
 * function either affect the display or hit the server, so more properly belong
 * to AnnotationService or PostMicro.
 * An annotation is based on a selection range relative to a contentElement.
 * The ID of a new range is 0, as it doesn't yet exist on the server.
 * type is an object of the AnnotationType class. 
 */
function Annotation( post, range, type, EoI )
{
	if ( null != post )
	{
		this.container = post.contentElement;
		this.quote_author = post.author;
		this.quote_title = post.title;
	}
	this.range = range;		// starting and ending positions of the highlighted text 
	this.post = post;		// equivalent to 'snippet' in our framework
	this.id = 0;			
	this.access = 'public';
	this.quote = '';		// highlighted plain text (without any HTML labels)
	this.isLocal = true;		
	this.isEditing = false;		// refers to the text in the 'note' field. In our case, it won't be editable. 
	this.type = type;			// type of the annotated entity (object of class AnnotationType)
	this.EoI = EoI;			

	return this;
}

function AnnotationType (name, caption, nOccurrences, color, description )
{
	this.name = name; 
	this.caption = caption;
	this.nOccurrences = nOccurrences;
	this.color = color;
	this.description = description;
	return this;	
}


/* Function that searches in ANNOTATION_TYPES for an object with name = 'name' and returns it
 * Input: 'name' string representing the name of an AnnotationType in the array ANNOTATION_TYPES
 * Output: AnnotationType object from ANNOTATION_TYPES which has name = 'name'. In case no object in the array has that value
 * for name, nothing is returned
*/
function getAnnotationType (name){
	for (var i=0; i<ANNOTATION_TYPES.length; i++){
		if (!ANNOTATION_TYPES[i].name){
			alert(getLocalized( "Bad format for schema.xml: please check that all the entities have a 'name' field."));
			return null;
		}
		else if (ANNOTATION_TYPES[i].name == name)
				return ANNOTATION_TYPES[i];
	}	
	return null; 		
}


function compareAnnotationRanges( a1, a2 )
{
	return compareWordRanges( a1.range, a2.range );
}

function annotationFromTextRange( post, textRange )
{
	var range = textRangeToWordRange( textRange, post.contentElement, _skipSmartcopy );
	if ( null == range )
		return null;  // The range is probably invalid (e.g. whitespace only)
	var annotation = new Annotation( post, range );
	// Can't just call toString() to grab the quote from the text range, because that would
	// include any smart copy text.
	annotation.quote = getTextRangeContent( textRange, _skipSmartcopy );
	//annotation.quote = textRange.toString( );
	return annotation;
}

/*
 * Destructor to prevent IE memory leaks
 */
Annotation.prototype.destruct = function( )
{
	this.container = null;
	this.post = null;
	if ( this.range && this.range.destroy )
		this.range.destroy( );
	this.range = null;
}

/* 	Function that reads an XML document with annotations and loads the annotations into the Array 'annotations'. 
	Input: xmlDoc: File in format XML
		 annotations: empty Array . It will be loaded by this function. 
		 snippet: object of class Snippet to which the annotations refer to. Read-only use in this function. Used in case the annotations have a corresponding EoI (stored in the Snippet object), to save the link. 
	Output: The number of annotations successfully saved into the Array 'annotations'. 
*/

function readAnnotations (xmlDoc, annotations, snippet)
{
	var child = null; 	
	var cont_annotations = 1;	//starts in 1 to allow a dummy annotation with index 0
	
	for ( var i = 0;  i < xmlDoc.documentElement.childNodes.length;  ++i ) {
		child = xmlDoc.documentElement.childNodes[ i ];
		
		if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'annotations' ){

			for (var j=0; j< 	child.childNodes.length;  ++j ) {
				grandchild = child.childNodes[j];
				
				if (grandchild.namespaceURI == NS_ATOM && getLocalName( grandchild ) == 'entry' ){
					var hOffset, hLength, text, id;
					var annotation = new Annotation( );
					annotation.id = cont_annotations; 	
					annotation.post = null;				
					var rangeStr = null;
					for ( var field = grandchild.firstChild;  field != null;  field = field.nextSibling )
					{
						
						if ( field.namespaceURI == NS_ATOM && getLocalName( field ) == 'summary' )
							annotation.quote = null == field.firstChild ? null : field.firstChild.nodeValue;
						else if ( field.namespaceURI == NS_ATOM && getLocalName( field ) == 'type' ){
							annotation.type = getAnnotationType(field.firstChild.nodeValue);
							if (!annotation.type){
								logError( "parseAnnotationXML Error: A type was found in " + xmlDoc.documentElement.textValue() +" that DO NOT correspond to the types defined in schema.xml" );
								alert( getLocalized( 'Wrong XML format: used type not defined in schema.xml' ) );
								return null
							}
						}else if ( field.namespaceURI == NS_ATOM && getLocalName( field ) == 'refId' ){
							if (field.firstChild){	//if a reference to an EoI was set, check that the entity exists
								annotation.EoI = getEoI (field.firstChild.nodeValue, snippet.EoIs);
								if (!annotation.EoI){
									logError( "parseAnnotationXML Error: A ref to an EoI that DO NOT exist was found in the input." );
									alert( getLocalized( 'Wrong XML format: ref to EoI that do not exist' ) );
									return null
								}
							}
						}
						
						else if ( field.namespaceURI == NS_ATOM && getLocalName( field ) == 'range' )
							rangeStr = field.firstChild.nodeValue;
						else if ( field.namespaceURI == NS_ATOM && getLocalName( field ) == 'access' )
						{
							if ( field.firstChild )
								annotation.access = field.firstChild.nodeValue;
							else
								annotation.access = 'private';
						}
					}

					annotation.range = new WordRange( );

					annotation.range.fromString( rangeStr, snippet.text);
					annotations[ annotations.length ] = annotation;

					cont_annotations = cont_annotations +1;
				}
			}
		}
	}
	if (cont_annotations > 1)
		annotations.sort( compareAnnotationRanges );
	
	return cont_annotations-1; 

}

/* ************************ SNIPPET Class ************************ */
/*
 * This is a data-only class with (almost) no methods.  This is because all annotation
 * function either affect the display or hit the server, so more properly belong
 * to AnnotationService or PostMicro.
 * Constructor for Snippet from an XML document (xmlDoc) */
function Snippet (xmlDoc)
{
	var child = null; 
	var grandchild = null; 
	for ( var i = 0;  i < xmlDoc.documentElement.childNodes.length;  ++i ) {
		child = xmlDoc.documentElement.childNodes[ i ];
		if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'annotations' )	
			continue;	//ignore the annotations for creating the snippet object
		else if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'snippetID' )
			this.id = child.firstChild.nodeValue;
		else if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'text' )
			this.text = child.firstChild.nodeValue;
		else if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'source' ){
			for (var j= 0; j<  child.childNodes.length; ++j){
				grandchild = child.childNodes[j];
				if ( grandchild.namespaceURI == NS_ATOM && getLocalName( grandchild ) == 'name' )
					this.source = grandchild.firstChild.nodeValue;
				else if ( grandchild.namespaceURI == NS_ATOM && getLocalName( grandchild ) == 'sourceId' )
					this.sourceId = grandchild.firstChild.nodeValue;
			}
		}
		else if ( child.namespaceURI == NS_ATOM && getLocalName( child ) == 'EoIs' ){
			this.EoIs = new Array();	
			for (var j= 0; j<  child.childNodes.length; ++j){
				grandchild = child.childNodes[j];
				if ( grandchild.namespaceURI == NS_ATOM && getLocalName( grandchild ) == 'EoI' ){
					var new_EoI = new EoI (grandchild);
					if (!new_EoI || !new_EoI.type){
						logError( "parseAnnotationXML Error: " + xmlDoc.documentElement.textValue() +"\nWrong format for EoI" );
						alert( getLocalized( 'wrong XML format' ) );
						return null
					}else
						this.EoIs[this.EoIs.length] = new_EoI
				}
			}
			if (this.EoIs.length == 0)
				this.EoIs = null;
		
		}
	}
	if (this.id != null && this.text != null){
		return this;
	}else{
		logError( "parseAnnotationXML Error: " + xmlDoc.documentElement.textValue() +"\nThe XML file doesn't contain labels for snippetID and text" );
		alert( getLocalized( 'wrong XML format' ) );
		return null
	}
}	

/* ************************ EoI Class ************************ */
/*
 * EoI: Entities of Interest in the snippet. 
	Constructor for EoI from 'EoI' XML node */
function EoI (XMLnode){
	var child = null; 
	for (var i= 0; i<XMLnode.childNodes.length; ++i){
		child = XMLnode.childNodes[i];
		if (child.namespaceURI == NS_ATOM && getLocalName( child ) == 'id' )
			this.id = child.firstChild.nodeValue; 
		else if (child.namespaceURI == NS_ATOM && getLocalName( child ) == 'symbol' )
			this.symbol = child.firstChild.nodeValue;
		else if (child.namespaceURI == NS_ATOM && getLocalName( child ) == 'type' ){
			this.type = getAnnotationType(child.firstChild.nodeValue);
			if (!this.type){
				logError( "parseAnnotationXML Error: incorrect type for EOI in input" );
				alert( getLocalized( 'Wrong XML format: used type not defined in schema.xml' ) );
				return null
			}
		}else if (child.namespaceURI == NS_ATOM && getLocalName( child ) == 'officialId' ){
			this.officialId = child.firstChild.nodeValue;
			var officialIdType = child.getAttribute('type');
			if (officialIdType == '')
				this.officialIdType = 'Ensembl';
			else
				this.officialIdType = officialIdType;
		}
		/*else if (child.namespaceURI == NS_ATOM && getLocalName( child ) == 'officialIdType' )
			this.officialIdType = child.firstChild.nodeValue;		*/
	}
	
	if (this.id != null && (this.symbol!= null || (this.officialId != null && this.officialIdType != null))){
		return this;
	}else{
		logError( "parseAnnotationXML Error: \nThe XML file doesn't contain appropiate labels for the EoIs" );
		alert( getLocalized( 'wrong XML format' ) );
		return null
	}
	
}

/* Function that searches the Array EoIs of objects of class EoI for an object whose id equals 'refEoI'
   Input: refEoI: string with the id of an EoI
          EoIs: Array of EoI objects. 
   Output: EoI object in EoIs that matches the provided id (refEoI). If no matches, null is returned.
 */
function getEoI (refEoI, EoIs){
	for (var i=0 ; i<EoIs.length; i++){
		if (EoIs[i].id == refEoI)
			return EoIs[i];
	}
	return null;
}
