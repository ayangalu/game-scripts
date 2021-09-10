const { HtmlValidate } = require('html-validate');

const html = new HtmlValidate({ extends: ['html-validate:recommended'] });
const report = html.validateString(process.argv[2]);

console.log(JSON.stringify(report));
