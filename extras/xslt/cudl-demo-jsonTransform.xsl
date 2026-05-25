<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
	version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:map="http://www.w3.org/2005/xpath-functions/map"
	xmlns:array="http://www.w3.org/2005/xpath-functions/array"
	exclude-result-prefixes="#all">

	<xsl:output method="json" indent="yes" />

	<xsl:template match="/">
		<xsl:choose>
			<xsl:when test="prefilteredDemo">
				<xsl:apply-templates select="prefilteredDemo" />
			</xsl:when>
			<xsl:otherwise>
				<xsl:message terminate="yes">cudl-demo-jsonTransform.xsl expects the XML produced by cudl-demo-preFilter.xsl. Use xslt-bundle/jsonTransform.xsl for the normal TEI pre-filter output.</xsl:message>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>

	<xsl:template match="prefilteredDemo">
		<xsl:sequence select="
			map {
				'pages': array {
					for $page in pages/page
					return map {
						'IIIFImageURL': string($page/@imageRef),
						'label': string($page/@label),
						'imageHeight': xs:integer($page/@height),
						'imageWidth': xs:integer($page/@width)
					}
				},
				'descriptiveMetadata': array {
					map {
						'displayImageRights': string(metadata/rights),
						'title': map {
							'display': true(),
							'seq': 1,
							'label': 'Title',
							'displayForm': string(metadata/title)
						},
						'shelfLocator': map {
							'display': true(),
							'seq': 2,
							'label': 'Reference',
							'displayForm': string(metadata/shelfLocator)
						},
						'abstract': map {
							'display': true(),
							'seq': 3,
							'label': 'Abstract',
							'displayForm': string(metadata/abstractHTML)
						},
						'creator': map {
							'display': true(),
							'seq': 4,
							'label': 'Creator',
							'displayForm': string(metadata/creator)
						},
						'date': map {
							'display': true(),
							'seq': 5,
							'label': 'Date',
							'displayForm': string(metadata/date)
						}
					}
				},
				'logicalStructures': array {
					map {
						'label': string(metadata/title),
						'startPagePosition': 1,
						'startPageLabel': string(pages/page[1]/@label),
						'children': array {
							for $page in pages/page
							return map {
								'label': string($page/@label),
								'startPagePosition': xs:integer($page/@n),
								'startPageLabel': string($page/@label)
							}
						}
					}
				}
			}" />
	</xsl:template>
</xsl:stylesheet>
