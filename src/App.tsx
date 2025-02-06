import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();


function App() {
  const [restaurants, setRestaurants] = useState<Array<Schema["Restaurant"]["type"]>>([]);

  useEffect(() => {
    client.models.Restaurant.observeQuery().subscribe({
      next: (data) => setRestaurants([...data.items]),
    });
  }, []);

  function createRestaurant() {
    client.models.Restaurant.create({ name: window.prompt("Restaurant name") });
  }

  return (
    <main>
      <h1>My todos</h1>
      <button onClick={createRestaurant}>+ new</button>
      <ul>
        {restaurants.map((restaurant) => (
          <li key={restaurant.id}>
            {restaurant.name}
          </li>
        ))}
      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/react/start/quickstart/#make-frontend-updates">
          Review next step of this tutorial.
        </a>
      </div>
    </main>
  );
}

export default App;
