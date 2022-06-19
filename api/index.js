const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const Handlebars = require('handlebars');
const intoStream = require('into-stream');
const puppeteer = require('puppeteer');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const app = express();

const variables = {
  name: 'Javier Bermúdez',
};

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch(); 
  }
  return browser;
}

async function renderTemplate(name) {
  const fileData = await readFileAsync(path.join(__dirname, 'templates-html', `${name}.html`));
  const template = Handlebars.compile(fileData.toString('utf-8'));

  const renderedTemplate = template(variables);

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(renderedTemplate, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div/>',
    headerTemplate: `<div style='font-size: 36px; color: black;'><div class='pageNumber'></div> <div>/</div> <div class='totalPages'></div></div>`
  });

  // Async
  page.close();
  writeFileAsync(path.join(__dirname, 'templates-pdf', `${name}.pdf`), pdf);

  return pdf;
}

app.get('/template', async (req, res) => {
  try {
    const name = req.query.name;

    const pdf = await renderTemplate(name);

    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', 'inline');
    intoStream(pdf).pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.listen(8000, () => {
  console.log('Server listening');
});
