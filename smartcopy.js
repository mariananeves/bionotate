/*
 * smartcopy.js
 *
 */
 
function smartcopyInit( )
{
	uphandler = function( ) {
		addSmartcopy( );
	};
	downhandler = function( ) {
		stripSubtree( document.documentElement, null, 'smart-copy' );
	};
	if ( document.addEventListener )
	{
		document.addEventListener( 'mouseup', uphandler, false );
		document.addEventListener( 'mousedown', downhandler, false );
	}
	else  // for IE:
	{
		/*
		if ( document.onmouseup )
		{
			document.onmouseup = function( ) { uphandler( ); document.onmouseup; };
			document.onmousedown = function( ) { downhandler( ); document.onmousedown; };
		}
		else
		{
			document.onmouseup = uphandler;
			document.onmousedown = downhandler;
		}
		*/
	}
}

function addSmartcopy( )
{
	briefPause( 200 );
	
	// this won't work with IE
	var selection = window.getSelection();
	var t = selection.type;

	// Verify W3C range support
	if ( selection.rangeCount == null )
		return false;

	// Check that some text has been selected
	if ( selection.rangeCount == 0 )
		return false;
	var range = selection.getRangeAt( 0 );
		
	// Check that the selection is within a post
	var postElement = getParentByTagClass( range.startContainer, null, PM_POST_CLASS, true, _skipPostContent );
	if ( null == postElement )
		return false;
	var post = getPostMicro( postElement );
	var contentElement = post.getContentElement( );
	
	// Check that both the start and end of the selection are within the post content
	if ( ! isElementDescendant( range.startContainer, contentElement ) ||
		! isElementDescendant( range.endContainer, contentElement ) )
		return false;
	
	// Check that there is actually some selected text
	var t = range.toString( );
	if ( 0 == t.length )
		return false;
	
	// OK, now we have a valid selection range to work with.
	var normRange = new NormalizedRange( range, contentElement );
	var oldStart = range.startContainer;
	var oldOffset = range.startOffset;
	var rangeLen = normRange.length;
	//trace( null, "Initial (" + range.startContainer + "," + range.startOffset + ")" );
	
	// Insert the link node
	var span = document.createElement( 'span' );
	span.className = 'smart-copy';
	span.appendChild( document.createTextNode( 'From ') );
	var a = document.createElement( 'a' );
	a.setAttribute( 'href', post.url );
	a.appendChild( document.createTextNode( post.title ) );
	span.appendChild( a );
	if ( null == post.date )
		span.appendChild( document.createTextNode( ' by ' + post.author + ': ') );
	else
		span.appendChild( document.createTextNode( ' by ' + post.author + ' on ' + post.date.toLocaleString() + ': ') );
	span.appendChild( document.createElement( 'br' ) );
	range.insertNode( span );
	
	// Find where the end of the range would be now
	var walker = new DOMWalker( span );
	walker.endTag = true;
	// Walk rangeLen characters forward
	var remain = rangeLen;
	while ( walker.walk( true ) )
	{
		if ( TEXT_NODE == walker.node.nodeType )
		{
			if ( remain < walker.node.length )
				break;
			else
				remain -= walker.node.length;
		}
	}
	
	if ( selection.removeAllRanges && selection.addRange )
	{
		selection.removeAllRanges( );
		range.setStart( oldStart, oldOffset );
		range.setEnd( walker.node, remain );
		selection.addRange( range );
	}
	else
	{
		range.setStart( oldStart, oldOffset );
		range.setEnd( walker.node, remain );
	}
}

/*
 * Passed to range functions so they will ignore smartcopy nodes
 */
function _skipSmartcopy( node )
{
	if ( ELEMENT_NODE == node.nodeType )
		return hasClass( node, 'smart-copy' ) ? true : false;
	return false;
}
