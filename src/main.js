/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, quantity, sale_price } = purchase;
   const revenue = (sale_price * (1 - discount / 100) - _product.purchase_price) * quantity;
   return Number(revenue.toFixed(2));
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const maxBonus = 5000;
    const minBonus = 1000;
    const step = (maxBonus - minBonus) / (total - 1);
    const bonus = maxBonus - step * index;
    return Math.round(bonus);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || !data.customers || !data.products || !data.sellers || !data.purchase_records) {
        throw new Error("Некорректные входные данные");
    }

    const sellersMap = {};
    const productsMap = {};

    data.sellers.forEach(seller => {
        sellersMap[seller.id] = {
            ...seller,
            sales_count: 0,
            revenue: 0,
            profit: 0,
            bonus: 0,
            top_products: {}
        };
    });

    data.products.forEach(product => {
        productsMap[product.sku] = product;
    });

    for (const record of data.purchase_records) {
        const seller = sellersMap[record.seller_id];
        if (!seller) continue;

        for (const item of record.items) {
            const product = productsMap[item.sku];
            if (!product) continue;

            const profit = calculateSimpleRevenue(item, product);
            seller.revenue += item.sale_price * item.quantity * (1 - item.discount / 100);
            seller.profit += profit;
            seller.sales_count += item.quantity;
            seller.top_products[item.sku] = (seller.top_products[item.sku] || 0) + item.quantity;
        }
    }

    const sellersList = Object.values(sellersMap).sort((a, b) => b.profit - a.profit);

    sellersList.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellersList.length, seller);
        const topSku = Object.entries(seller.top_products)
            .sort(([, aQty], [, bQty]) => bQty - aQty)[0]?.[0];
        seller.top_products = topSku ? [topSku] : [];
    });

    return sellersList.map(({ id, first_name, last_name, sales_count, revenue, profit, bonus, top_products }) => ({
        seller_id: id,
        name: `${first_name} ${last_name}`,
        sales_count,
        revenue: Number(revenue.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        bonus,
        top_products
    }));
}