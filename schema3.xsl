<?xml version="1.0"?> 
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
<xsl:output method="html" encoding="utf-8"/>

<xsl:template match="/">
 
    
	  <xsl:for-each select="schema/questions/question">
	    <p>
	    <form>
		<xsl:attribute name="name"><xsl:value-of select="id"/></xsl:attribute>
		<i><xsl:value-of select="text"/></i><br/>
		<xsl:apply-templates select="answers"/>
		
		
	    </form>
	    </p>
        </xsl:for-each>
    
</xsl:template>


<xsl:template name="show_answers" match="answers">
			
		<xsl:for-each select="answer">
		  <input>
			<xsl:attribute name="type">radio</xsl:attribute>
			<xsl:attribute name="name">answer</xsl:attribute>
			<xsl:attribute name="value"><xsl:value-of select="value"/></xsl:attribute>
			<xsl:if test="position()=last()"> <xsl:attribute name="checked"></xsl:attribute></xsl:if>
		  </input>
			<xsl:value-of select="text"/><br/>
		  
		</xsl:for-each>
		
</xsl:template>



</xsl:stylesheet>



