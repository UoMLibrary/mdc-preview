<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
	version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	exclude-result-prefixes="#all">

	<xsl:mode on-no-match="shallow-skip" />
	<xsl:output method="xml" indent="yes" />

	<xsl:template match="/demoItem">
		<prefilteredDemo id="{@id}">
			<metadata>
				<title>
					<xsl:value-of select="normalize-space(title)" />
				</title>
				<shelfLocator>
					<xsl:value-of select="normalize-space(shelfLocator)" />
				</shelfLocator>
				<abstractHTML>
					<xsl:apply-templates select="abstract/node()" mode="html-text" />
				</abstractHTML>
				<creator>
					<xsl:value-of select="normalize-space(creator)" />
				</creator>
				<date>
					<xsl:value-of select="normalize-space(date)" />
				</date>
				<rights>
					<xsl:value-of select="normalize-space(rights)" />
				</rights>
			</metadata>
			<pages>
				<xsl:apply-templates select="pages/page" />
			</pages>
		</prefilteredDemo>
	</xsl:template>

	<xsl:template match="page">
		<page n="{position()}" imageRef="{@imageRef}" label="{@label}" width="{@width}" height="{@height}" />
	</xsl:template>

	<xsl:template match="p" mode="html-text">
		<xsl:text>&lt;p&gt;</xsl:text>
		<xsl:value-of select="normalize-space(.)" />
		<xsl:text>&lt;/p&gt;</xsl:text>
	</xsl:template>
</xsl:stylesheet>
