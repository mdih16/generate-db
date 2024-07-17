import { useState, useEffect } from "react";
import supabase from "../services/supabase";

function App() {
  const [errorMessage, setErrorMessage] = useState(null);
  const [sucessMessage, setSucessMessage] = useState(null);
  const [productUrl, setProductUrl] = useState("");
  const [text, setText] = useState("");
  const [prod, setProductName] = useState("");
  const [productData, setProductData] = useState(null);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [skinTypes, setSkinTypes] = useState([]);
  const [selectedSkinTypes, setSelectedSkinTypes] = useState([]);

  function normalizeSpaces(str) {
    return str
      .trim() // Remove leading and trailing whitespace
      .split(/\s+/) // Split the string by one or more whitespace characters
      .filter(Boolean) // Remove any empty strings from the array
      .join(" "); // Join the words with a single space
  }

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase.from("brand").select("*");
      if (error) {
        console.error("Error fetching brands:", error);
      } else {
        setBrands(data);
      }
    };

    const fetchProducts = async () => {
      const { data, error } = await supabase.from("product").select("*");
      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data);
      }
    };

    const fetchIngredients = async () => {
      const { data, error } = await supabase.from("ingredient").select("*");
      if (error) {
        console.error("Error fetching ingredients:", error);
      } else {
        setIngredients(data);
      }
    };

    const fetchSkinTypes = async () => {
      const { data, error } = await supabase.from("skintype").select("*");
      if (error) {
        console.error("Error fetching skintypes:", error);
      } else {
        setSkinTypes(data);
      }
    };

    fetchBrands();
    fetchProducts();
    fetchIngredients();
    fetchSkinTypes();
  }, []);

  const fetchProductData = async (url) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/data?url=${encodeURIComponent(url)}`,
        {
          method: "GET",
        }
      );

      if (response.status === 400) {
        setErrorMessage("Måste ange url");
        setSucessMessage(null);
        return;
      }

      if (response.status === 500) {
        setErrorMessage("Något gick fel när datan skulle hämtas");
        setSucessMessage(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const ean = data.content.ean.$c;
        if (!ean) {
          setErrorMessage(
            "Produkten har inget ean nummer, försök med en annnan"
          );
          setSucessMessage(null);
          return;
        } else {
          for (const product of products) {
            if (product.ean === ean) {
              setErrorMessage("Produkten finns redan i databasen");
              setSucessMessage(null);
              return;
            }
          }
        }
        setProductData(data);
        setProductName(data.productName);
        setErrorMessage(null);
        setSucessMessage("Lyckades med att hämta data");
      } else {
        setErrorMessage("Något gick åt helvete");
        setSucessMessage(null);
      }
    } catch (error) {
      setErrorMessage("Nätverksfel, servern kanske inte är igång");
      setSucessMessage(null);
    }
  };

  const insertProduct = async () => {
    try {
      // Find the brand or create a new one if it doesn't exist
      let brand = brands.find((b) => b.brandname === productData.brandName);

      if (!brand) {
        const newBrand = {
          brandname: productData.brandName,
        };

        const { data: brandData, error: brandError } = await supabase
          .from("brand")
          .insert([newBrand])
          .select();

        if (brandError) {
          console.error("Error inserting brand:", brandError);
          return;
        }
        brand = brandData[0];
        brands.push(brand);
        console.log("Inserted brand:", brandData);
      }

      const brandId = brand.brand_id;
      const categoryId = null;
      const image = null;
      const productName = normalizeSpaces(prod);
      const eanCode = productData.content.ean.$c;

      const newProduct = {
        ean: eanCode,
        brand_id: brandId,
        category_id: categoryId,
        productname: productName,
        image: image,
      };

      const { data: productDataResponse, error: productError } = await supabase
        .from("product")
        .insert([newProduct])
        .select();

      if (productError) {
        console.error("Error inserting product:", productError);
        return;
      }
      const product = productDataResponse[0];
      products.push(product);
      console.log("Inserted product:", productDataResponse);

      const ingredientIds = [];
      const ingredientsArray = text
        .split(",")
        .map((item) => normalizeSpaces(item));
      const ingredientOrders = ingredientsArray.map((_, index) => index + 1);
      const newIngredients = [];
      const ingredientOrderMap = [];

      // Collect existing ingredient IDs and prepare new ingredients
      for (let i = 0; i < ingredientsArray.length; i++) {
        const normalizedItem = ingredientsArray[i].toLowerCase();
        const existingIngredient = ingredients.find(
          (ing) => ing.ingredientname.toLowerCase() === normalizedItem
        );

        if (existingIngredient) {
          ingredientIds.push(existingIngredient.ingredient_id);
          ingredientOrderMap.push({
            ingredient_id: existingIngredient.ingredient_id,
            order: ingredientOrders[i],
          });
        } else {
          newIngredients.push({ ingredientname: ingredientsArray[i] });
          ingredientOrderMap.push({
            ingredient_name: ingredientsArray[i],
            order: ingredientOrders[i],
          });
        }
      }

      // Perform bulk insert of new ingredients
      if (newIngredients.length > 0) {
        const { data: insertedIngredients, error: newIngredientsInsertError } =
          await supabase.from("ingredient").insert(newIngredients).select();

        if (newIngredientsInsertError) {
          console.error(
            "Error inserting new ingredients:",
            newIngredientsInsertError
          );
          return;
        } else {
          console.log("Inserted new ingredients:", insertedIngredients);

          // Add the newly inserted ingredient IDs to the ingredientOrderMap
          for (const newIngredient of insertedIngredients) {
            const item = ingredientOrderMap.find(
              (entry) => entry.ingredient_name === newIngredient.ingredientname
            );
            if (item) {
              item.ingredient_id = newIngredient.ingredient_id;
              ingredientIds.push(newIngredient.ingredient_id);
            }
          }
        }
      }

      const productIngredients = ingredientOrderMap.map((item) => ({
        product_id: product.product_id,
        ingredient_id: item.ingredient_id,
        order: item.order,
      }));

      const {
        data: insertedProductIngredients,
        error: productIngredientsInsertError,
      } = await supabase
        .from("productingredient")
        .insert(productIngredients)
        .select();

      if (productIngredientsInsertError) {
        console.error(
          "Error inserting product ingredients:",
          productIngredientsInsertError
        );
        return;
      } else {
        console.log(
          "Inserted product ingredients:",
          insertedProductIngredients
        );
      }

      const productSkinTypes = [];
      for (const skintype_id of selectedSkinTypes) {
        productSkinTypes.push({
          product_id: product.product_id,
          skintype_id: skintype_id,
        });
      }

      const { data: insertedProductSkinTypes, error: skinTypesInsertError } =
        await supabase
          .from("productskintype")
          .insert(productSkinTypes)
          .select();

      if (skinTypesInsertError) {
        console.error(
          "Error inserting product skin types:",
          skinTypesInsertError
        );
      } else {
        console.log("Inserted product skin types:", insertedProductSkinTypes);
      }

      setText("");
      setProductData(null);
      setProductUrl("");
      setSucessMessage("Lyckades lägga produkten i databasen");
      location.reload();
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-gray-700 text-white text-lg px-10">
      {errorMessage && <span className="text-orange-400">{errorMessage}</span>}
      {sucessMessage && <span className="text-green-400">{sucessMessage}</span>}
      <div className="flex flex-col gap-1">
        <span>Url till produkt:</span>
        <div className="flex flex-row gap-2">
          <input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            className="text-black w-1/2"
          />
          <button
            onClick={() => {
              setText("");
              setProductData(null);
              fetchProductData(productUrl);
            }}
            className="bg-slate-400 p-2"
          >
            Hämta
          </button>
        </div>
      </div>
      {productData && (
        <div className="mt-10 flex flex-col items-center">
          <input
            value={prod}
            onChange={(e) => setProductName(e.target.value)}
            className="font-semibold text-2xl bg-transparent w-1/2 text-center focus:outline-none"
          />
          <span className="font-medium text-xl">{productData.brandName}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-black w-full mt-10 h-96"
          />
          <select
            value={selectedSkinTypes}
            onChange={(e) => {
              const values = [...e.target.selectedOptions].map(
                (opt) => opt.value
              );
              setSelectedSkinTypes(values);
            }}
            multiple={true}
            className="w-1/3 text-black mt-4"
          >
            {skinTypes.map((item) => {
              return (
                <option key={item.skintype_id} value={item.skintype_id}>
                  {item.label}
                </option>
              );
            })}
          </select>
          <button
            onClick={insertProduct}
            className="bg-slate-400 p-2 mt-10 w-1/2"
            disabled={
              selectedSkinTypes.length === 0 || text === "" || prod === ""
            }
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
