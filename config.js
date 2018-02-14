/*
 * Annotation configuration settings
 */

// If this is true, uses paths like annotate/nnn
// if false, use paths like annotation/annotate.php?id=nnn
USE_NICE_SERVICE_URLS = false;

NICE_ANNOTATION_SERVICE_URL = '/annotate';
UGLY_ANNOTATION_SERVICE_URL = '/annotate.php';

// If true, include loguser= field in annotation server requests (and in summary.php requests)
// This is useful because the Apache logs will then include user behavior data for analysis
ANNOTATION_LOGUSER_URLS = false;

/* Logging Settings */
TRACING_ON = true;		// switch on to output trace() calls
LOGGING_ON = true;		// switch on to output logError() calls
INWINDOW_LOG = false;	// switch on to output to HTML document instead of/in addition to console

// Set these to true to view certain kinds of events
// Most of these are only useful for debugging specific areas of code.
// annotation-service, however, is particularly useful for most debugging
setTrace( 'annotation-service', true );	// XMLHttp calls to the annotation service
setTrace( 'word-range', true );			// Word Range calculations (e.g. converting from Text Range)
setTrace( 'find-quote', true );			// Check if quote matches current state of document
setTrace( 'node-walk', true );			// Used for going through nodes in document order
setTrace( 'highlighting', true );			// Text highlighting calculations
setTrace( 'align-notes', true );			// Aligning margin notes with highlighting
setTrace( 'xpointer', true );				// XPointer debugging;  code doesn't even use XPointer


