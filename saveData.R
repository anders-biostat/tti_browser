load("LFC_TTI.RData")
load("normalized_fpkm_rp_and_tr.RData")

all(Human.Macaque.brain$Ensembl.ID == one.to.one.orthologs$Human)

lfcs <- list(
  Human = list(
    Macaque = list(
      Brain = rbind(Human.Macaque.brain$TRlog2FoldChange, 
                    Human.Macaque.brain$RPlog2FoldChange,
                    (Human.Macaque.brain$pAdjBH  < 0.05) + 
                      2 * (Human.Macaque.brain$Translational.Tuning.Index > 0),
                    Human.Macaque.brain$TTI.SE,
                    Human.Macaque.brain$TRlfcSE,
                    Human.Macaque.brain$RPlfcSE),
      Testis = rbind(Human.Macaque.testis$TRlog2FoldChange, 
                    Human.Macaque.testis$RPlog2FoldChange,
                    (Human.Macaque.testis$pAdjBH  < 0.05) + 
                      2 * (Human.Macaque.testis$Translational.Tuning.Index > 0),
                    Human.Macaque.testis$TTI.SE,
                    Human.Macaque.testis$TRlfcSE,
                    Human.Macaque.testis$RPlfcSE)
    ),
    Mouse = list(
      Brain = rbind(Human.Mouse.brain$TRlog2FoldChange, 
                    Human.Mouse.brain$RPlog2FoldChange,
                    (Human.Mouse.brain$pAdjBH  < 0.05) + 
                      2 * (Human.Mouse.brain$Translational.Tuning.Index > 0),
                    Human.Mouse.brain$TTI.SE,
                    Human.Mouse.brain$TRlfcSE,
                    Human.Mouse.brain$RPlfcSE),
      Testis = rbind(Human.Mouse.testis$TRlog2FoldChange, 
                     Human.Mouse.testis$RPlog2FoldChange,
                     (Human.Mouse.testis$pAdjBH  < 0.05) + 
                       2 * (Human.Mouse.testis$Translational.Tuning.Index > 0),
                     Human.Mouse.testis$TTI.SE,
                     Human.Mouse.testis$TRlfcSE,
                     Human.Mouse.testis$RPlfcSE)
    )
  ),
  Macaque = list(
    Mouse = list(
      Brain = rbind(Macaque.Mouse.brain$TRlog2FoldChange, 
                    Macaque.Mouse.brain$RPlog2FoldChange,
                    (Macaque.Mouse.brain$pAdjBH  < 0.05) + 
                      2 * (Macaque.Mouse.brain$Translational.Tuning.Index > 0),
                    Macaque.Mouse.brain$TTI.SE,
                    Macaque.Mouse.brain$TRlfcSE,
                    Macaque.Mouse.brain$RPlfcSE),
      Liver = rbind(Macaque.Mouse.liver$TRlog2FoldChange, 
                    Macaque.Mouse.liver$RPlog2FoldChange,
                    (Macaque.Mouse.liver$pAdjBH  < 0.05) + 
                      2 * (Macaque.Mouse.liver$Translational.Tuning.Index > 0),
                    Macaque.Mouse.liver$TTI.SE,
                    Macaque.Mouse.liver$TRlfcSE,
                    Macaque.Mouse.liver$RPlfcSE),
      Testis = rbind(Macaque.Mouse.testis$TRlog2FoldChange, 
                     Macaque.Mouse.testis$RPlog2FoldChange,
                     (Macaque.Mouse.testis$pAdjBH  < 0.05) + 
                       2 * (Macaque.Mouse.testis$Translational.Tuning.Index > 0),
                     Macaque.Mouse.testis$TTI.SE,
                     Macaque.Mouse.testis$TRlfcSE,
                     Macaque.Mouse.testis$RPlfcSE)
    ),
    Opossum = list(
      Brain = rbind(Macaque.Opossum.brain$TRlog2FoldChange, 
                    Macaque.Opossum.brain$RPlog2FoldChange,
                    (Macaque.Opossum.brain$pAdjBH  < 0.05) + 
                      2 * (Macaque.Opossum.brain$Translational.Tuning.Index > 0),
                    Macaque.Opossum.brain$TTI.SE,
                    Macaque.Opossum.brain$TRlfcSE,
                    Macaque.Opossum.brain$RPlfcSE),
      Liver = rbind(Macaque.Opossum.liver$TRlog2FoldChange, 
                    Macaque.Opossum.liver$RPlog2FoldChange,
                    (Macaque.Opossum.liver$pAdjBH  < 0.05) + 
                      2 * (Macaque.Opossum.liver$Translational.Tuning.Index > 0),
                    Macaque.Opossum.liver$TTI.SE,
                    Macaque.Opossum.liver$TRlfcSE,
                    Macaque.Opossum.liver$RPlfcSE),
      Testis = rbind(Macaque.Opossum.testis$TRlog2FoldChange, 
                     Macaque.Opossum.testis$RPlog2FoldChange,
                     (Macaque.Opossum.testis$pAdjBH  < 0.05) + 
                       2 * (Macaque.Opossum.testis$Translational.Tuning.Index > 0),
                     Macaque.Opossum.testis$TTI.SE,
                     Macaque.Opossum.testis$TRlfcSE,
                     Macaque.Opossum.testis$RPlfcSE)
    )
  ),
  Mouse = list(
    Platypus = list(
      Brain = rbind(Mouse.Platypus.brain$TRlog2FoldChange, 
                    Mouse.Platypus.brain$RPlog2FoldChange,
                    (Mouse.Platypus.brain$pAdjBH  < 0.05) + 
                      2 * (Mouse.Platypus.brain$Translational.Tuning.Index > 0),
                    Mouse.Platypus.brain$TTI.SE,
                    Mouse.Platypus.brain$TRlfcSE,
                    Mouse.Platypus.brain$RPlfcSE),
      Liver = rbind(Mouse.Platypus.liver$TRlog2FoldChange, 
                    Mouse.Platypus.liver$RPlog2FoldChange,
                    (Mouse.Platypus.liver$pAdjBH  < 0.05) + 
                      2 * (Mouse.Platypus.liver$Translational.Tuning.Index > 0),
                    Mouse.Platypus.liver$TTI.SE,
                    Mouse.Platypus.liver$TRlfcSE,
                    Mouse.Platypus.liver$RPlfcSE),
      Testis = rbind(Mouse.Platypus.testis$TRlog2FoldChange, 
                     Mouse.Platypus.testis$RPlog2FoldChange,
                     (Mouse.Platypus.testis$pAdjBH  < 0.05) + 
                       2 * (Mouse.Platypus.testis$Translational.Tuning.Index > 0),
                     Mouse.Platypus.testis$TTI.SE,
                     Mouse.Platypus.testis$TRlfcSE,
                     Mouse.Platypus.testis$RPlfcSE)
    ),
    Opossum = list(
      Brain = rbind(Mouse.Opossum.brain$TRlog2FoldChange, 
                    Mouse.Opossum.brain$RPlog2FoldChange,
                    (Mouse.Opossum.brain$pAdjBH  < 0.05) + 
                      2 * (Mouse.Opossum.brain$Translational.Tuning.Index > 0),
                    Mouse.Opossum.brain$TTI.SE,
                    Mouse.Opossum.brain$TRlfcSE,
                    Mouse.Opossum.brain$RPlfcSE),
      Liver = rbind(Mouse.Opossum.liver$TRlog2FoldChange, 
                    Mouse.Opossum.liver$RPlog2FoldChange,
                    (Mouse.Opossum.liver$pAdjBH  < 0.05) + 
                      2 * (Mouse.Opossum.liver$Translational.Tuning.Index > 0),
                    Mouse.Opossum.liver$TTI.SE,
                    Mouse.Opossum.liver$TRlfcSE,
                    Mouse.Opossum.liver$RPlfcSE),
      Testis = rbind(Mouse.Opossum.testis$TRlog2FoldChange, 
                     Mouse.Opossum.testis$RPlog2FoldChange,
                     (Mouse.Opossum.testis$pAdjBH  < 0.05) + 
                       2 * (Mouse.Opossum.testis$Translational.Tuning.Index > 0),
                     Mouse.Opossum.testis$TTI.SE,
                     Mouse.Opossum.testis$TRlfcSE,
                     Mouse.Opossum.testis$RPlfcSE)
    )
  )
)

library(biomaRt)

mart <- useMart("ensembl", dataset = "mdomestica_gene_ensembl",  host = "oct2014.archive.ensembl.org")
opossumGenes <- getBM( c("ensembl_gene_id", "chromosome_name", "external_gene_name"), 
                       "ensembl_gene_id", one.to.one.orthologs$Opossum, mart )
rownames(opossumGenes) <- opossumGenes$ensembl_gene_id
opossumGenes <- opossumGenes[as.character(one.to.one.orthologs$Opossum), ]

mart <- useMart("ensembl", "oanatinus_gene_ensembl")
platypusGenes <- getBM( c("ensembl_gene_id", "chromosome_name", "external_gene_name"), 
                       "ensembl_gene_id", one.to.one.orthologs$Platypus, mart )
rownames(platypusGenes) <- platypusGenes$ensembl_gene_id
platypusGenes <- platypusGenes[as.character(one.to.one.orthologs$Platypus), ]

genes <- list(
  Human = rbind(
    Human.Macaque.brain$Ensembl.ID,
    Human.Macaque.brain$Gene.symbol,
    Human.Macaque.brain$Chr
  ),
  Mouse = rbind(
    Mouse.Opossum.brain$Ensembl.ID,
    Mouse.Opossum.brain$Gene.symbol,
    Mouse.Opossum.brain$Chr
  ),
  Macaque = rbind(
    Macaque.Mouse.brain$Ensembl.ID,
    Macaque.Mouse.brain$Gene.symbol,
    Macaque.Mouse.brain$Chr),
  Opossum = rbind(
    opossumGenes$ensembl_gene_id,
    opossumGenes$external_gene_name,
    opossumGenes$chromosome_name
  ),
  Platypus = rbind(
    platypusGenes$ensembl_gene_id,
    platypusGenes$external_gene_name,
    platypusGenes$chromosome_name
  )
)


library(tidyverse)
tibble(sampleId = colnames(gene.expression.data)) %>%
  filter(!grepl("Ensembl", sampleId) & !grepl("^Chicken", sampleId)) %>%
  separate(sampleId, c("species", "tissue", "type", "rep"), sep = "[.]", remove = F) %>%
  filter(!(species == "Human" & tissue == "Liver")) -> st

geneExpr <- t(gene.expression.data[, st$sampleId])

library(jsonlite)

writeLines(c(paste0("var lfData = ", toJSON(lfcs), ";"),
             paste0("var geneInfo = ", toJSON(genes), ";"),
             paste0("var sampleTable = ", toJSON(st, dataframe = "columns"), ";"),
             paste0("var geneExpr = ", toJSON(geneExpr), ";")),
             "src/data.js")
