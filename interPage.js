// interPage.js
import React from "react";
import { useNavigate } from "react-router-dom"; // assegura't de tenir react-router-dom

const InterPage = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/graella"); // Canvia aquesta ruta per la de la teva graella
  };

  return (
    <div style={styles.container}>
      <button style={styles.button} onClick={handleClick}>
        Avaluació
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#fff", // fons blanc
  },
  button: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    borderRadius: "10px",
    border: "2px solid #3b82f6", // blau similar als botons de classe
    backgroundColor: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease-in-out",
  },
};

export default InterPage;

