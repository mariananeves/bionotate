<?xml version="1.0"?> 
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:output method="html" encoding="utf-8"/>

<xsl:template match="/">
    <xsl:if test="count(schema/entities/entity)>1">
	<p>Mark selected text as: </p>
    </xsl:if>
	  <xsl:for-each select="schema/entities/entity">
        <button>
          <xsl:attribute name="title">Click here to mark the selection as a <xsl:value-of select="caption"/></xsl:attribute>
		  <xsl:attribute name="class">createAnnotation</xsl:attribute>
		  <xsl:attribute name="onclick">createAnnotation(null, '<xsl:value-of select="name"/>', true)</xsl:attribute>
          <xsl:value-of select="caption"/>
        </button>
      </xsl:for-each>
    <xsl:if test="count(schema/entities/entity)>1">
	<br/>
    </xsl:if>
</xsl:template>
</xsl:stylesheet>



