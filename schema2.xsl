<?xml version="1.0"?> 
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">


<xsl:template match="/">
  

	function loadAnnotationTypes() {
	
		var listAnnotationTypes= []; 
		<xsl:for-each select="schema/entities/entity">
			listAnnotationTypes[listAnnotationTypes.length] = new AnnotationType ('<xsl:value-of select="name"/>', '<xsl:value-of select="caption"/>', '<xsl:value-of select="nOccurrences"/>', '<xsl:value-of select="color"/>', '<xsl:value-of select="description"/>' );

		</xsl:for-each>
		window.ANNOTATION_TYPES = listAnnotationTypes;
		
	}


</xsl:template>
</xsl:stylesheet>
