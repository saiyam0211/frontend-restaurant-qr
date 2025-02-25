import React, { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";

function CustomerMenu() {
  const [menu, setMenu] = useState([]);
  const [socket, setSocket] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [modifyingOrderId, setModifyingOrderId] = useState(null);
  const [isModifying, setIsModifying] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const table = urlParams.get("table");
    setTableNumber(table || "");

    const fetchMenu = async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/menu");
        setMenu(response.data);
      } catch (error) {
        console.error("Error fetching menu", error);
        setError("Unable to fetch menu. Please try again later.");
      }
    };

    const fetchOrders = async () => {
      if (table) {
        try {
          const response = await axios.get(
            `http://localhost:3001/api/orders?tableNumber=${table}`
          );
          setOrders(response.data);
        } catch (error) {
          console.error("Error fetching orders", error);
        }
      }
    };

    fetchMenu();
    fetchOrders();
  }, []);

  const handleQuantityChange = (itemId, operation) => {
    setSelectedItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.menuItem === itemId);

      if (!existingItem) {
        if (operation === "add") {
          return [...prevItems, { menuItem: itemId, quantity: 1 }];
        }
        return prevItems;
      }

      if (operation === "remove" && existingItem.quantity === 1) {
        return prevItems.filter((item) => item.menuItem !== itemId);
      }

      return prevItems.map((item) => {
        if (item.menuItem === itemId) {
          return {
            ...item,
            quantity:
              operation === "add" ? item.quantity + 1 : item.quantity - 1,
          };
        }
        return item;
      });
    });
  };

  const handleModifyOrder = (order) => {
    setModifyingOrderId(order._id);
    setSelectedItems(order.items);
    setIsModifying(true);
    setTableNumber(order.tableNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateOrder = async () => {
    if (!modifyingOrderId || selectedItems.length === 0) {
      setError("Cannot update empty order");
      return;
    }

    try {
      const updatedOrderPayload = {
        tableNumber,
        items: selectedItems.map((item) => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
        })),
        totalAmount: calculateTotal(),
        status: "modified",
      };

      const response = await axios.put(
        `http://localhost:3001/api/orders/${modifyingOrderId}`,
        updatedOrderPayload
      );

      // Emit socket event for order modification
      if (socket) {
        socket.emit("orderModified", {
          orderId: modifyingOrderId,
          tableNumber,
          items: selectedItems,
        });
      }

      if (response.data) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === modifyingOrderId ? response.data : order
          )
        );

        setModifyingOrderId(null);
        setSelectedItems([]);
        setIsModifying(false);
        setOrderPlaced(true);
        setTimeout(() => setOrderPlaced(false), 3000);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to update order. Please try again."
      );
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/api/orders/${orderId}`);

      // Emit socket event for order cancellation
      if (socket) {
        socket.emit("orderCancelled", {
          orderId,
          tableNumber,
        });
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order._id !== orderId)
      );
      if (modifyingOrderId === orderId) {
        setModifyingOrderId(null);
        setSelectedItems([]);
        setIsModifying(false);
      }
    } catch (error) {
      setError("Failed to cancel order. Please try again.");
    }
  };

  const handleSubmitOrder = async () => {
    if (!tableNumber) {
      setError("Please select a table number before placing an order.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("Your order is empty. Please add items before submitting.");
      return;
    }

    try {
      const orderPayload = {
        tableNumber,
        items: selectedItems,
        totalAmount: calculateTotal(),
        status: "new",
      };

      const response = await axios.post(
        "http://localhost:3001/api/orders",
        orderPayload
      );
      setOrders((prevOrders) => [...prevOrders, response.data]);

      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 3000);
      setSelectedItems([]);
      setError(null);
    } catch (error) {
      setError("Failed to place order. Please try again.");
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => {
      const menuItem = menu.find((m) => m._id === item.menuItem);
      return total + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0);
  };

  const getItemQuantity = (itemId) => {
    const item = selectedItems.find((item) => item.menuItem === itemId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-16 px-6 font-serif">
      {/* Error Message */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl shadow-lg">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 mr-4 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation Overlay */}
      {orderPlaced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-12 rounded-3xl text-center shadow-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-24 h-24 mx-auto text-green-500 mb-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-3xl font-light text-neutral-800 mb-4">
              {isModifying ? "Order Updated" : "Order Placed"}
            </h2>
            <p className="text-neutral-600">
              {isModifying
                ? "Your order has been updated successfully"
                : "Your order has been placed successfully"}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-thin text-neutral-800 tracking-wider mb-8">
            THE MENU
          </h1>
          <div className="flex justify-center items-center">
            <div className="relative">
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="appearance-none w-full px-6 py-3 pr-10 text-neutral-700 bg-white border border-neutral-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500"
                disabled={isModifying}
              >
                <option value="">Select Your Table</option>
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Table {i + 1}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-700">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Current Order Form (if modifying) */}
        {isModifying && (
          <div className="mb-16 bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-light text-neutral-800">
                Modifying Order #{modifyingOrderId.slice(-4)}
              </h2>
              <button
                onClick={() => {
                  setIsModifying(false);
                  setModifyingOrderId(null);
                  setSelectedItems([]);
                }}
                className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-full text-sm tracking-wider uppercase hover:bg-neutral-200 transition-colors"
              >
                Cancel Modification
              </button>
            </div>
          </div>
        )}

        {/* Menu Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {menu.map((item) => {
            const quantity = getItemQuantity(item._id);
            return (
              <div
                key={item._id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
              >
                <div className="p-8">
                  <h2 className="text-3xl font-light text-neutral-800 mb-4 tracking-wide">
                    {item.name}
                  </h2>
                  <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-light text-neutral-700">
                      ₹{item.price}
                    </span>
                    <div className="flex items-center space-x-4">
                      {quantity > 0 ? (
                        <>
                          <button
                            onClick={() =>
                              handleQuantityChange(item._id, "remove")
                            }
                            className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200"
                          >
                            -
                          </button>
                          <span className="text-neutral-700">{quantity}</span>
                          <button
                            onClick={() =>
                              handleQuantityChange(item._id, "add")
                            }
                            className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleQuantityChange(item._id, "add")}
                          className="px-6 py-3 bg-neutral-900 text-white rounded-full text-sm tracking-wider uppercase transition-colors hover:bg-neutral-800 active:scale-95"
                        >
                          Add to Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order History */}
        {orders.length > 0 && (
          <div className="mt-16">
            <h2 className="text-4xl font-light text-neutral-800 mb-8 text-center">
              Your Orders
            </h2>
            <div className="space-y-6">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl shadow-lg p-8"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-light text-neutral-800">
                      Order #{order._id.slice(-4)}
                    </h3>
                    <div className="space-x-4">
                      <button
                        onClick={() => handleModifyOrder(order)}
                        className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-full text-sm tracking-wider uppercase hover:bg-neutral-200 transition-colors"
                        disabled={isModifying}
                      >
                        Modify
                      </button>
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="px-6 py-2 bg-red-100 text-red-700 rounded-full text-sm tracking-wider uppercase hover:bg-red-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {order.items.map((item) => {
                      const menuItem = menu.find(
                        (m) => m._id === item.menuItem
                      );
                      return menuItem ? (
                        <div
                          key={item.menuItem}
                          className="flex justify-between items-center text-neutral-700"
                        >
                          <span>{menuItem.name}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-neutral-500">
                              Quantity: {item.quantity}
                            </span>
                            <span className="font-semibold">
                              ₹{menuItem.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-6 border-t">
                    <span className="text-xl font-light text-neutral-800">
                      Total
                    </span>
                    <span className="text-xl font-semibold text-neutral-900">
                      ₹{order.totalAmount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Order Summary */}
        {selectedItems.length > 0 && (
          <div className="mt-16 bg-white shadow-lg rounded-2xl p-8 sticky bottom-8">
            <h2 className="text-3xl font-light text-neutral-800 mb-6">
              {isModifying ? "Modified Order" : "Your Order"}
            </h2>
            <div className="space-y-4 mb-6">
              {selectedItems.map((item) => {
                const menuItem = menu.find((m) => m._id === item.menuItem);
                return menuItem ? (
                  <div
                    key={item.menuItem}
                    className="flex justify-between items-center text-neutral-700"
                  >
                    <span>{menuItem.name}</span>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.menuItem, "remove")
                          }
                          className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200"
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            handleQuantityChange(item.menuItem, "add")
                          }
                          className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold">
                        ₹{menuItem.price * item.quantity}
                      </span>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex justify-between items-center mb-6 border-t pt-4">
              <span className="text-2xl font-light text-neutral-800">
                Total
              </span>
              <span className="text-2xl font-semibold text-neutral-900">
                ₹{calculateTotal()}
              </span>
            </div>
            <button
              onClick={isModifying ? handleUpdateOrder : handleSubmitOrder}
              className="w-full py-4 bg-neutral-900 text-white rounded-full uppercase tracking-wider hover:bg-neutral-800 transition-colors active:scale-95"
            >
              {isModifying ? "Update Order" : "Place Order"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerMenu;
