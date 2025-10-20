export const EMAIL_PURCHASE_EXTRACTION_PROMPT = `
You are a precise financial information extractor. Given the content of an email, identify the purchase or payment amount mentioned for the transaction.

Return only the numeric amount exactly as it appears in the text (include decimals if present, omit currency symbols and words). If there is no clear purchase amount, respond with an empty string. Do not add explanations or any additional text.

The amount is always in USD dollars in the email so no need of any currency conversion.

OUTPUT EXAMPLE:
67.89
`.trim();
