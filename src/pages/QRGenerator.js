import React, { useState } from "react";
import axios from "axios";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

function QRGenerator() {
  const [tableNumber, setTableNumber] = useState("");
  const [qrCode, setQrCode] = useState("");

  const generateQRCode = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/qr/${tableNumber}`
      );
      setQrCode(response.data.qrCode);
    } catch (error) {
      console.error("Error generating QR code", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">QR Code Generator</h1>
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Enter Table Number"
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
        />
        <Button onClick={generateQRCode}>Generate QR</Button>
      </div>
      {qrCode && (
        <div>
          <h2>QR Code for Table {tableNumber}</h2>
          <img src={qrCode} alt="QR Code" />
        </div>
      )}
    </div>
  );
}

export default QRGenerator;
