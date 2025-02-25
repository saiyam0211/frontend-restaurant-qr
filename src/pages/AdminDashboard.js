import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import Toast from "../components/ui/Toast";

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState({});
  const [cancelledOrders, setCancelledOrders] = useState({});
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState("current");
  const [notifications, setNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");

  // Utility function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    // Connect to socket
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    // Fetch initial orders
    const fetchOrders = async () => {
      try {
        const response = await axios.get("http://localhost:3001/api/orders");
        // Separate active, completed, and cancelled orders
        const active = response.data.filter(
          (order) =>
            order.status !== "Completed" && order.status !== "Cancelled"
        );
        const completed = response.data.filter(
          (order) => order.status === "Completed"
        );
        const cancelled = response.data.filter(
          (order) => order.status === "Cancelled"
        );

        // Group completed and cancelled orders by date
        const completedByDate = completed.reduce((acc, order) => {
          const orderDate = formatDate(order.createdAt);
          if (!acc[orderDate]) {
            acc[orderDate] = [];
          }
          acc[orderDate].push(order);
          return acc;
        }, {});

        const cancelledByDate = cancelled.reduce((acc, order) => {
          const orderDate = formatDate(order.createdAt);
          if (!acc[orderDate]) {
            acc[orderDate] = [];
          }
          acc[orderDate].push(order);
          return acc;
        }, {});

        setOrders(active);
        setCompletedOrders(completedByDate);
        setCancelledOrders(cancelledByDate);
      } catch (error) {
        console.error("Error fetching orders", error);
      }
    };
    fetchOrders();

    // Socket event listeners
    newSocket.on("newOrder", (order) => {
      setOrders((prevOrders) => [...prevOrders, order]);
    });

    newSocket.on("orderUpdated", (updatedOrder) => {
      if (updatedOrder.status === "Completed") {
        const orderDate = formatDate(updatedOrder.createdAt);
        setCompletedOrders((prevCompleted) => {
          const updated = { ...prevCompleted };
          if (!updated[orderDate]) {
            updated[orderDate] = [];
          }
          updated[orderDate].unshift(updatedOrder);
          return updated;
        });

        setOrders((prevOrders) =>
          prevOrders.filter((order) => order._id !== updatedOrder._id)
        );
      } else if (updatedOrder.status === "Cancelled") {
        const orderDate = formatDate(updatedOrder.createdAt);
        setCancelledOrders((prevCancelled) => {
          const updated = { ...prevCancelled };
          if (!updated[orderDate]) {
            updated[orderDate] = [];
          }
          updated[orderDate].unshift(updatedOrder);
          return updated;
        });

        setOrders((prevOrders) =>
          prevOrders.filter((order) => order._id !== updatedOrder._id)
        );
      } else if (["Pending", "In Progress"].includes(updatedOrder.status)) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === updatedOrder._id ? updatedOrder : order
          )
        );
      }
    });

    newSocket.on("orderModified", (data) => {
      const message = `Order #${data.orderId.slice(
        -4
      )} has been modified by Table ${data.tableNumber}`;
      handleNotification(message, "warning");
      // Refresh orders
      fetchOrders();
    });

    newSocket.on("orderCancelled", (data) => {
      const message = `Order #${data.orderId.slice(-4)} from Table ${
        data.tableNumber
      } has been cancelled`;
      handleNotification(message, "error");
      // Refresh orders
      fetchOrders();
    });

    return () => newSocket.close();
  }, []);

  const handleNotification = (message, type) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    // Auto-hide notification after 5 seconds
    setTimeout(() => setShowNotification(false), 5000);
  };

  const handleStatusUpdate = (orderId, status) => {
    if (socket) {
      socket.emit("updateOrderStatus", { orderId, status });
    }
  };

  // Calculate total money lost from cancelled orders
  const calculateTotalLost = () => {
    return Object.values(cancelledOrders)
      .flat()
      .reduce((total, order) => {
        const orderTotal = order.items.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );
        return total + orderTotal;
      }, 0);
  };

  // Calculate total money earned from completed orders
  const calculateTotalEarned = () => {
    return Object.values(completedOrders)
      .flat()
      .reduce((total, order) => {
        const orderTotal = order.items.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0
        );
        return total + orderTotal;
      }, 0);
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  return (
    <div className="bg-[#f5f5f5] min-h-screen py-16 px-6 font-serif">
      {showNotification && (
        <Toast
          message={notificationMessage}
          type={notificationType}
          onClose={() => setShowNotification(false)}
        />
      )}
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-thin text-neutral-800 tracking-wider mb-4">
            Restaurant Dashboard
          </h1>
          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={() => setActiveTab("current")}
              className={`px-6 py-2 rounded-full ${
                activeTab === "current"
                  ? "bg-neutral-800 text-white"
                  : "bg-white text-neutral-800 border border-neutral-300"
              } transition-colors`}
            >
              Active Orders
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-6 py-2 rounded-full ${
                activeTab === "completed"
                  ? "bg-neutral-800 text-white"
                  : "bg-white text-neutral-800 border border-neutral-300"
              } transition-colors`}
            >
              Completed Orders
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`px-6 py-2 rounded-full ${
                activeTab === "cancelled"
                  ? "bg-neutral-800 text-white"
                  : "bg-white text-neutral-800 border border-neutral-300"
              } transition-colors`}
            >
              Cancelled Orders
            </button>
          </div>
          {activeTab === "completed" && (
            <div className="text-xl text-neutral-700 mb-4">
              Total Money Earned:
              <span className="font-semibold text-green-600 ml-2">
                ₹{calculateTotalEarned().toLocaleString()}
              </span>
            </div>
          )}
          {activeTab === "cancelled" && (
            <div className="text-xl text-neutral-700 mb-4">
              Total Money Lost:
              <span className="font-semibold text-red-600 ml-2">
                ₹{calculateTotalLost().toLocaleString()}
              </span>
            </div>
          )}
        </header>

        {activeTab === "current" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-light text-neutral-800">
                      Table {order.tableNumber}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <h3 className="text-lg font-medium text-neutral-700 mb-2">
                      Order Items
                    </h3>
                    {order.items.map((item) => (
                      <div
                        key={item._id}
                        className="flex justify-between text-neutral-600 text-sm mb-1"
                      >
                        <span>{item.menuItem.name}</span>
                        <span>
                          x {item.quantity}
                          <span className="ml-2 font-semibold">
                            ₹{item.menuItem.price * item.quantity}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-neutral-700 mb-2">
                      Update Status
                    </h3>
                    <div className="space-y-2">
                      {["Pending", "In Progress", "Completed", "Cancelled"].map(
                        (status) => (
                          <label
                            key={status}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer 
                            ${order.status === status ? "bg-neutral-100" : ""} 
                            ${
                              (order.status === "Completed" ||
                                order.status === "Cancelled") &&
                              status !== order.status
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-neutral-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`status-${order._id}`}
                              value={status}
                              checked={order.status === status}
                              onChange={() =>
                                handleStatusUpdate(order._id, status)
                              }
                              disabled={
                                (order.status === "Completed" ||
                                  order.status === "Cancelled") &&
                                status !== order.status
                              }
                              className="form-radio text-neutral-800 focus:ring-neutral-500"
                            />
                            <span>{status}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "completed" ? (
          <div>
            {Object.keys(completedOrders).length === 0 ? (
              <div className="text-center text-neutral-600 py-12">
                No completed orders yet.
              </div>
            ) : (
              Object.entries(completedOrders)
                .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                .map(([date, dayOrders]) => (
                  <div key={date} className="mb-12">
                    <h2 className="text-3xl font-light text-neutral-800 mb-6 border-b pb-2">
                      {date}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {dayOrders.map((order) => (
                        <div
                          key={order._id}
                          className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl"
                        >
                          <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                              <h2 className="text-2xl font-light text-neutral-800">
                                Table {order.tableNumber}
                              </h2>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase bg-green-100 text-green-800`}
                              >
                                Completed
                              </span>
                            </div>

                            <div className="border-t pt-4 mb-4">
                              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                                Order Items
                              </h3>
                              {order.items.map((item) => (
                                <div
                                  key={item._id}
                                  className="flex justify-between text-neutral-600 text-sm mb-1"
                                >
                                  <span>{item.menuItem.name}</span>
                                  <span>
                                    x {item.quantity}
                                    <span className="ml-2 font-semibold">
                                      ₹{item.menuItem.price * item.quantity}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="border-t pt-4">
                              <h3 className="text-lg font-medium text-neutral-700">
                                Total Order Value
                                <span className="ml-2 text-green-600 font-semibold">
                                  ₹
                                  {order.items
                                    .reduce(
                                      (sum, item) =>
                                        sum +
                                        item.menuItem.price * item.quantity,
                                      0
                                    )
                                    .toLocaleString()}
                                </span>
                              </h3>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        ) : (
          <div>
            {Object.keys(cancelledOrders).length === 0 ? (
              <div className="text-center text-neutral-600 py-12">
                No cancelled orders yet.
              </div>
            ) : (
              Object.entries(cancelledOrders)
                .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                .map(([date, dayOrders]) => (
                  <div key={date} className="mb-12">
                    <h2 className="text-3xl font-light text-neutral-800 mb-6 border-b pb-2">
                      {date}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {dayOrders.map((order) => (
                        <div
                          key={order._id}
                          className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl"
                        >
                          <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                              <h2 className="text-2xl font-light text-neutral-800">
                                Table {order.tableNumber}
                              </h2>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase bg-red-100 text-red-800`}
                              >
                                Cancelled
                              </span>
                            </div>

                            <div className="border-t pt-4 mb-4">
                              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                                Order Items
                              </h3>
                              {order.items.map((item) => (
                                <div
                                  key={item._id}
                                  className="flex justify-between text-neutral-600 text-sm mb-1"
                                >
                                  <span>{item.menuItem.name}</span>
                                  <span>
                                    x {item.quantity}
                                    <span className="ml-2 font-semibold">
                                      ₹{item.menuItem.price * item.quantity}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="border-t pt-4">
                              <h3 className="text-lg font-medium text-neutral-700">
                                Total Order Value
                                <span className="ml-2 text-red-600 font-semibold">
                                  ₹
                                  {order.items
                                    .reduce(
                                      (sum, item) =>
                                        sum +
                                        item.menuItem.price * item.quantity,
                                      0
                                    )
                                    .toLocaleString()}
                                </span>
                              </h3>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
