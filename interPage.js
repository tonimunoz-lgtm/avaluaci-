// interPage.js
import React from "react";
import { useNavigate } from "react-router-dom"; // si utilitzes react-router

const InterPage = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/graella"); // Canvia "/graella" per la ruta real de la graella d'avaluació
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
    backgroundColor: "#fff",
  },
  button: {
    padding: "16px 32px",
    fontSize: "18px",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#4f46e5", // exemple color
    color: "#fff",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease-in-out",
  },
};

export default InterPage;
