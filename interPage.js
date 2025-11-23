// interPage.js
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const InterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Rebem la informació de la classe seleccionada
  const { classe, alumnes } = location.state || {};

  // Estat per les pàgines clonades
  const [clones, setClones] = useState([]);

  // Crear nova pàgina clon
  const handleAddClone = () => {
    const nomNova = prompt("Introdueix el nom de la nova etiqueta:");
    if (nomNova) {
      setClones([...clones, { nom: nomNova, id: Date.now() }]);
    }
  };

  // Eliminar una pàgina clon
  const handleDeleteClone = (id) => {
    setClones(clones.filter(clone => clone.id !== id));
  };

  // Anar a la pàgina d'avaluació
  const goToAvaluacio = () => {
    navigate("/avaluacio", { state: { classe, alumnes } });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Classe: {classe}</h2>
      
      <button 
        style={{
          padding: "15px 30px",
          margin: "10px 0",
          backgroundColor: "#4CAF50",
          color: "white",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer"
        }}
        onClick={goToAvaluacio}
      >
        AVALUACIÓ
      </button>

      <div style={{ marginTop: "20px" }}>
        <button 
          style={{ marginRight: "10px", fontSize: "18px" }}
          onClick={handleAddClone}
        >
          +
        </button>
        {clones.map(clone => (
          <div key={clone.id} style={{ marginTop: "10px", display: "flex", alignItems: "center" }}>
            <span style={{
              padding: "10px",
              backgroundColor: "#2196F3",
              color: "white",
              borderRadius: "6px",
              marginRight: "10px"
            }}>{clone.nom}</span>
            <button onClick={() => handleDeleteClone(clone.id)}>Eliminar</button>
            <button 
              style={{ marginLeft: "10px" }}
              onClick={() => navigate("/avaluacio", { state: { classe, alumnes } })}
            >
              Avaluació
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InterPage;
