export const PROTEIN_CALCULATOR_CONFIG = {
  brand: { green: '#6BCB45', dark: '#111111' },
  formula: {
    sexFactors: {
      male: { value: 1, source: 'protlys_estimate', note: 'No external guideline is cited for this adjustment.' },
      female: { value: 0.92, source: 'protlys_estimate', note: 'No external guideline is cited for this adjustment.' },
      other: { value: 0.96, source: 'protlys_estimate', note: 'No external guideline is cited for this adjustment.' },
    },
    activity: {
      sedentary: { value: 1.0, source: 'not_used_in_target', note: 'Displayed for context; the current calculator does not apply this activity factor to the target.' },
      lightlyActive: { value: 1.2, source: 'not_used_in_target', note: 'Displayed for context; the current calculator does not apply this activity factor to the target.' },
      moderatelyActive: { value: 1.375, source: 'not_used_in_target', note: 'Displayed for context; the current calculator does not apply this activity factor to the target.' },
      veryActive: { value: 1.55, source: 'not_used_in_target', note: 'Displayed for context; the current calculator does not apply this activity factor to the target.' },
      athlete: { value: 1.725, source: 'not_used_in_target', note: 'Displayed for context; the current calculator does not apply this activity factor to the target.' },
    },
    goals: {
      health: { gramsPerKg: 0.8, source: 'who_fao_unu_2007', label: 'WHO/FAO/UNU (2007), Technical Report Series 935', note: 'The calculator uses 0.8 g/kg, rounded from the report’s 0.83 g/kg/day safe intake for healthy adults.' },
      maintain: { gramsPerKg: 1.2, source: 'protlys_estimate', label: 'Protlys estimate', note: '1.2 g/kg is within published active/exercising ranges, but this exact goal factor is a Protlys estimate.' },
      muscle: { gramsPerKg: 1.6, source: 'issn_2017', label: 'ISSN Position Stand (2017)', note: '1.6 g/kg falls within the ISSN 1.4–2.0 g/kg/day range for exercising individuals.' },
      performance: { gramsPerKg: 1.8, source: 'issn_2017', label: 'ISSN Position Stand (2017)', note: '1.8 g/kg falls within the ISSN 1.4–2.0 g/kg/day range for exercising individuals.' },
      lose: { gramsPerKg: 1.2, source: 'protlys_estimate', label: 'Protlys estimate', note: 'The exact 1.2 g/kg weight-loss factor is not directly specified by the cited guidelines used here.' },
    },
    range: { minGramsPerKg: 0.8, maxGramsPerKg: 2.2, minSource: 'who_fao_unu_2007', maxSource: 'protlys_estimate' },
  },
  sources: {
    who_fao_unu_2007: { title: 'Protein and amino acid requirements in human nutrition', publisher: 'WHO/FAO/UNU', year: 2007, citation: 'WHO Technical Report Series 935', url: 'https://iris.who.int/bitstream/handle/10665/43411/WHO_TRS_935_eng.pdf' },
    issn_2017: { title: 'International Society of Sports Nutrition Position Stand: protein and exercise', publisher: 'ISSN', year: 2017, citation: 'Journal of the International Society of Sports Nutrition 14:20', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
    acsm_2016: { title: 'Nutrition and Athletic Performance', publisher: 'Academy of Nutrition and Dietetics / Dietitians of Canada / ACSM', year: 2016, citation: 'J Acad Nutr Diet. 116(3):501-528', url: 'https://pubmed.ncbi.nlm.nih.gov/26920240/' },
  },
  disclaimer: 'General guidance, not medical advice. If you have a kidney condition or medical needs, check with a health professional.',
};