export type SpendTransaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string
};

// Generate mock transactions for the past year
const generateMockTransactions = (): SpendTransaction[] => {
  const categories = [
    "Food & Dining",
    "Shopping",
    "Transportation",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Travel",
    "Groceries",
  ];

  const descriptions: { [key: string]: string[] } = {
    "Food & Dining": ["Restaurant", "Coffee Shop", "Fast Food", "Delivery"],
    "Shopping": ["Online Store", "Clothing", "Electronics", "Books"],
    "Transportation": ["Uber", "Gas Station", "Parking", "Public Transit"],
    "Entertainment": ["Movie Theater", "Concert", "Streaming", "Gaming"],
    "Bills & Utilities": ["Electric Bill", "Internet", "Phone Bill", "Water"],
    "Healthcare": ["Pharmacy", "Doctor Visit", "Gym", "Health Insurance"],
    "Travel": ["Hotel", "Flight", "Car Rental", "Travel Insurance"],
    "Groceries": ["Supermarket", "Farmers Market", "Convenience Store"],
  };

  const transactions: SpendTransaction[] = [];
  const now = new Date();

  // Generate transactions for the past 365 days
  for (let i = 0; i < 365; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Random number of transactions per day (1-5, ensuring at least 1 for today)
    const txCount = i === 0 ? Math.floor(Math.random() * 4) + 2 : Math.floor(Math.random() * 5);

    for (let j = 0; j < txCount; j++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const descList = descriptions[category];
      const description =
        descList[Math.floor(Math.random() * descList.length)];

      // Generate realistic amounts based on category
      let amount: number;
      switch (category) {
        case "Food & Dining":
          amount = Math.random() * 80 + 10; // $10-$90
          break;
        case "Shopping":
          amount = Math.random() * 200 + 20; // $20-$220
          break;
        case "Transportation":
          amount = Math.random() * 50 + 5; // $5-$55
          break;
        case "Entertainment":
          amount = Math.random() * 60 + 15; // $15-$75
          break;
        case "Bills & Utilities":
          amount = Math.random() * 150 + 50; // $50-$200
          break;
        case "Healthcare":
          amount = Math.random() * 100 + 20; // $20-$120
          break;
        case "Travel":
          amount = Math.random() * 500 + 100; // $100-$600
          break;
        case "Groceries":
          amount = Math.random() * 80 + 20; // $20-$100
          break;
        default:
          amount = Math.random() * 50 + 10;
      }

      transactions.push({
        id: `tx-${date.getTime()}-${j}`,
        amount: Math.round(amount * 100) / 100,
        category,
        description,
        date: date.toISOString(),
      });
    }
  }

  return transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const MOCK_SPEND_DATA = generateMockTransactions();

