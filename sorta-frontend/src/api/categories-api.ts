export async function fetchCategories() {
  const request = await fetch(`${import.meta.env.VITE_API_URL!}/categories`, {
    credentials: "include",
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });
  const response = await request.json();
  return response;
}
export async function createCategory(body: Omit<Category, "bookmarks" | "id">) {
  //   const body = JSON.stringify({ bookmarks: ["1", "2", "3", "4"] });
  const request = await fetch(`${import.meta.env.VITE_API_URL!}/categories`, {
    credentials: "include",
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });
  const response = await request.json();
  return response;
}
