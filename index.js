const express = require("express");
const { Shopify } = require("@shopify/shopify-api");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Shopify Context
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SHOPIFY_SCOPES.split(","),
  HOST_NAME: process.env.HOST_NAME.replace(/https?:\/\//, ""),
  IS_EMBEDDED_APP: false,
  API_VERSION: "2024-10",
});

// Step 1: Redirect to Shopify OAuth
app.get("/auth", async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop parameter!");

  const redirectUrl = await Shopify.Auth.beginAuth(
    req,
    res,
    shop,
    "/callback",
    false
  );
  res.redirect(redirectUrl);
});

// Step 2: Handle OAuth Callback
app.get("/callback", async (req, res) => {
  try {
    const session = await Shopify.Auth.validateAuthCallback(req, res, req.query);
    const { accessToken, shop } = session;

    // Step 3: Automate Store Setup
    await setupStore(shop, accessToken);

    res.send("Store setup complete! Check your Shopify admin.");
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    res.status(500).send("Authentication error.");
  }
});

// Automate Store Setup
async function setupStore(shop, accessToken) {
  await addProduct(shop, accessToken, {
    title: "Yoga Mat",
    body_html: "A durable non-slip yoga mat.",
    vendor: "Your Store",
    product_type: "Fitness",
    variants: [{ price: "20.00", sku: "YOGA001" }],
  });

  await addPage(shop, accessToken, {
    title: "About Us",
    body_html: "<p>Welcome to our store. We're excited to have you!</p>",
  });

  console.log("Store setup complete.");
}

// Add a Product
async function addProduct(shop, accessToken, productData) {
  const url = `https://${shop}/admin/api/2024-10/products.json`;
  await axios.post(url, { product: productData }, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  console.log(`Product added: ${productData.title}`);
}

// Add a Page
async function addPage(shop, accessToken, pageData) {
  const url = `https://${shop}/admin/api/2024-10/pages.json`;
  await axios.post(url, { page: pageData }, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  console.log(`Page added: ${pageData.title}`);
}

// Start Server
app.listen(PORT, () => {
  console.log(`App running at http://localhost:${PORT}`);
});
