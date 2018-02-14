/*
 * post-micro.js
  */

// These class names will change once there's a microformat standard.
PM_AREA_CLASS = 'articles';
PM_INFO_CLASS = 'entry-info';		// the information (PubMed ID, entities of interest) of the fragment
PM_POST_CLASS = 'hentry';		// this is an addressable fragment for annotation
PM_CONTENT_CLASS = 'entry-content';	// the content portion of a fragment
//PM_TITLE_CLASS = 'entry-title';	// the title of an annotated fragment
//PM_AUTHOR_CLASS = 'author';		// the author of the fragment
//PM_DATE_CLASS = 'published';		// the creation/modification date of the fragment
PM_URL_REL = 'bookmark';		// the url of this fragment (uses rel rather than class attribute)

/*
 * This class keeps track of PostMicro stuff on a page
 * Initially that information was integrated into individual DOM nodes (especially
 * as PostMicro objects), but because of memory leak problems I'm moving it here.
 */
function PostPageInfo( )
{
	this.posts = new Array( );
	this.postsById = new Object( );
	this.postsByUrl = new Object( );
	this.IndexPosts( document.documentElement );
	return this;
}

PostPageInfo.prototype.IndexPosts = function( root )
{
	var posts = getChildrenByTagClass( root, null, PM_POST_CLASS );
	for ( var i = 0;  i < posts.length;  ++i )
	{
		var postElement = posts[ i ];
		var post = new PostMicro( postElement );
		this.posts[ this.posts.length ] = post;
		if ( null != posts[ i ].id && '' != posts[ i ].id )
			this.postsById[ posts[ i ].id ] = post;
		if ( null != post.url && '' != post.url )
			this.postsByUrl[ post.url ] = post;
		postElement.post = post;
	}
}

PostPageInfo.prototype.getPostById = function( id )
{
	return this.postsById[ id ];
}

PostPageInfo.prototype.getPostByUrl = function( url )
{
	return this.postsByUrl[ url ];
}


/*
 * For ignoring post content when looking for specially tagged nodes, so that authors
 * of that content (i.e. users) can't mess things up.
 */
function _skipPostContent( node )
{
	return ( ELEMENT_NODE == node.nodeType && hasClass( node, PM_CONTENT_CLASS ) );
}


/*
 * Post Class
 * This is attached to the root DOM node of a post (not the document node, rather the node
 * with the appropriate class and ID for a post).  It stores references to child nodes
 * containing relevant metadata.  The class also provides a place to hang useful functions,
 * e.g. for annotation or smart copy support.
 */
function PostMicro( element)
{
	// Point the post and DOM node to each other
	this.element = element;

	// The node containing the content
	// Any offsets (e.g. as used by annotations) are from the start of this node's children
	this.contentElement = getChildByTagClass( this.element, null, PM_CONTENT_CLASS, _skipPostContent );

	return this;
}

/*
 * Accessor for related element
 * Used so that we can avoid storing a pointer to a DOM node,
 * which tends to cause memory leaks on IE.
 */
PostMicro.prototype.getElement = function( )
{
	return this.element;
}


/*
 * Accessor for content element
 * Used so that we can avoid storing a pointer to a DOM node,
 * which tends to cause memory leaks on IE.
 */
PostMicro.prototype.getContentElement = function( )
{
	return getChildByTagClass( this.element, null, PM_CONTENT_CLASS, _skipPostContent );
}

function getPostMicro( element )
{
	if ( ! element.post )
		element.post= new PostMicro( element );
	return element.post;
}

function findPostByUrl( url )
{
	var fragments = new Array( );
	getChildrenByTagClass( document.documentElement, null, PM_POST_CLASS, fragments, _skipPostContent );
	//alert ("getAllPoSTCLASS returns "+ fragments.length);
	for ( var i = 0;  i < fragments.length;  ++i )
	{
		urlNode = getChildAnchor( fragments[ i ], PM_URL_REL, _skipPostContent );
		// IE returns the absolute URL, not the actual content of the href field
		// (i.e., the bloody piece of junk lies).  So instead of straight equality,
		// I need to test whether the endings of the two URLs match.  In rare
		// cases, this might cause a mismatch.  #geof#
		var href = urlNode.getAttribute( 'href' );
		if ( null != urlNode && href.length >= url.length && href.substring( href.length - url.length ) == url )
			return getPostMicro( fragments[ i ] );
	}
	return null;
}

