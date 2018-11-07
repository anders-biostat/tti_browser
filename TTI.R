library( rlc )
library( tidyverse )

load("~/tmp/Mouse.Opossum.RData")
exprMat = as.matrix( read.delim("~/tmp/mouse_opossum_normalized_fpkm_rp_and_tr.txt", row.names = 1 ) )

Brain <- Brain[ rowSums( is.na( Brain[ , c( "TRlog2FoldChange", "Translational.Tuning.Index" ) ] ) ) == 0, ]
#Brain <- Brain[ Brain$TTI.SE < .3, ]
exprMat <- exprMat[ Brain$Ensembl.ID, ]

tibble( col=colnames(exprMat) ) %>%
   separate( "col", c( "species", "organ", "assay", "repl" ), remove=FALSE ) %>%
   filter( species %in% c( "Mouse", "Opossum" ), organ == "Brain" ) ->
      exprCols


clamp <- function( x, max, min = -max )
   pmin( max, pmax( min, x ) )

cur_gene <- 13

select_gene <- function(k) {
   cur_gene <<- k;
   updateCharts( "chart", "cross" )
   updateCharts( "chart2", "cross" )
   #updateCharts( "chart3", "bar" )
   updateCharts( "expr" )
}

openPage( FALSE, layout="table2x2" )
lc_scatter(
   dat(
      x = clamp( Brain$TRlog2FoldChange, 5 ),
      y = clamp( Brain$Translational.Tuning.Index, 5 ),
      label = Brain$Gene.symbol,
      size = 1,
      domainX = c( -5, 5 ),
      domainY = c( -5, 5 ),
      axisTitleX = "log2 fold change transcription",
      axisTitleY = "Translational Tuning Index",
      on_mouseover = select_gene ),
   id = "chart", layerId = "points", place = "A1"
)
lc_line(
   dat(
      x = cbind(
         c( Brain$TRlog2FoldChange[cur_gene] - Brain$TRlfcSE[cur_gene],
            Brain$TRlog2FoldChange[cur_gene] + Brain$TRlfcSE[cur_gene] ),
         c( Brain$TRlog2FoldChange[cur_gene],
            Brain$TRlog2FoldChange[cur_gene] ) ),
      y = cbind(
         c( Brain$Translational.Tuning.Index[cur_gene],
            Brain$Translational.Tuning.Index[cur_gene] ),
         c( pmax( -1e10, Brain$Translational.Tuning.Index[cur_gene] - Brain$TTI.SE[cur_gene] ),
            pmin(  1e10, Brain$Translational.Tuning.Index[cur_gene] + Brain$TTI.SE[cur_gene] ) ) ),
      color = "red",
      transitionDuration = 0
   ),
   id = "chart", addLayer = TRUE, layerId = "cross"
)

lc_scatter(
   dat(
      x = str_c( exprCols$species, "_", exprCols$repl ),
      y = exprMat[ cur_gene, exprCols$col ],
      title = Brain[cur_gene,"Gene.symbol"]
   ),
      colourValue = exprCols$assay,
      symbolValue = exprCols$species,
      transitionDuration = 10,
      logScaleY = 2,
      axisTitleY = "FPKM",
   id = "expr", place = "A2"
)

lc_scatter(
   dat(
      x = clamp( Brain$TRlog2FoldChange, 5 ),
      y = clamp( Brain$RPlog2FoldChange, 5 ),
      label = Brain$Gene.symbol,
      size = 1,
      domainX = c( -5, 5 ),
      domainY = c( -5, 5 ),
      axisTitleX = "log2 fold change transcription",
      axisTitleY = "log2 fold change translation",
      on_mouseover = select_gene ),
   id = "chart2", layerId = "points", place = "B1"
)
lc_line(
   dat(
      x = cbind(
         c( Brain$TRlog2FoldChange[cur_gene] - Brain$TRlfcSE[cur_gene],
            Brain$TRlog2FoldChange[cur_gene] + Brain$TRlfcSE[cur_gene] ),
         c( Brain$TRlog2FoldChange[cur_gene],
            Brain$TRlog2FoldChange[cur_gene] ) ),
      y = cbind(
         c( Brain$RPlog2FoldChange[cur_gene],
            Brain$RPlog2FoldChange[cur_gene] ),
         c( Brain$RPlog2FoldChange[cur_gene] - Brain$RPlfcSE[cur_gene],
            Brain$RPlog2FoldChange[cur_gene] + Brain$RPlfcSE[cur_gene] ) ),
      color = "red",
      transitionDuration = 0,
   ),
   id = "chart2", addLayer = TRUE, layerId = "cross"
)

TRmeans <- log10(rowMeans( exprMat[ , exprCols$col[exprCols$assay=="TR"] ] ))

lc_scatter(
   dat(
      x = TRmeans,
      y = clamp( Brain$TRlog2FoldChange, 5 ),
      label = Brain$Gene.symbol,
      size = 1,
      domainY = c( -5, 5 ),
      on_mouseover = select_gene,
   id = "chart3", layerId = "points", place = "B2"
)
lc_line(
   dat(
      x = cbind(
         c( TRmeans[cur_gene],
            TRmeans[cur_gene] ) ),
      y = cbind(
         c( Brain$TRlog2FoldChange[cur_gene] - Brain$TRlfcSE[cur_gene],
            Brain$TRlog2FoldChange[cur_gene] + Brain$TRlfcSE[cur_gene] ) ),
      color = "red",
      transitionDuration = 0,
   ),
   id = "chart3", addLayer = TRUE, layerId = "bar"
)
