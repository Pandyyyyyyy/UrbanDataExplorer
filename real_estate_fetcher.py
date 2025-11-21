"""
Script spécialisé pour récupérer les données immobilières de Paris.
"""

import requests
import pandas as pd
import json
from datetime import datetime, timedelta
from pathlib import Path
import logging
from typing import Dict, List, Optional
import time

from data_fetcher import DataFetcher

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RealEstateDataFetcher(DataFetcher):
    """Classe spécialisée pour récupérer les données immobilières."""
    
    def __init__(self, output_dir: str = "data/bronze"):
        super().__init__(output_dir)
        self.arrondissements = self._load_arrondissements()
    
    def _load_arrondissements(self) -> List[Dict]:
        """Charge la liste des arrondissements."""
        try:
            from config_real_estate import PARIS_ARRONDISSEMENTS
            return PARIS_ARRONDISSEMENTS
        except ImportError:
            logger.warning("config_real_estate.py non trouvé, utilisation de la liste par défaut")
            return [{"num": i, "nom": f"{i}e", "code_insee": f"751{i:02d}"} for i in range(1, 21)]
    
    def generate_sample_data(self) -> Dict:
        """
        Génère des données d'exemple pour le développement.
        En production, cette méthode serait remplacée par de vraies sources.
        """
        import random
        from datetime import datetime, timedelta
        
        logger.info("Génération de données d'exemple...")
        
        # Générer des données pour les 3 dernières années
        years = [2022, 2023, 2024]
        months = list(range(1, 13))
        
        data = {
            "arrondissements": [],
            "timestamp": datetime.now().isoformat()
        }
        
        for arr in self.arrondissements:
            arr_data = {
                "arrondissement": arr["num"],
                "nom": arr["nom"],
                "code_insee": arr["code_insee"],
                # Indicateurs principaux
                "prix_m2_median": [],
                "logements_sociaux_pourcentage": random.uniform(5, 25),
                "typologie": {},
                "evolution": [],
                # Indicateurs personnalisés
                "pollution_qualite_air": {
                    "indice_atmo": random.uniform(1, 10),  # Indice ATMO (1=très bon, 10=très mauvais)
                    "pm25_moyen": round(random.uniform(5, 30), 2),  # µg/m³
                    "pm10_moyen": round(random.uniform(10, 50), 2),  # µg/m³
                    "no2_moyen": round(random.uniform(20, 80), 2),  # µg/m³
                    "date_mesure": datetime.now().strftime("%Y-%m-%d")
                },
                "delits_enregistres": {
                    "total_delits": random.randint(500, 5000),
                    "delits_par_1000_habitants": round(random.uniform(10, 100), 2),
                    "cambriolages": random.randint(50, 500),
                    "vols": random.randint(200, 2000),
                    "violences": random.randint(100, 1000),
                    "annee": 2024
                },
                "revenus_moyens": {
                    "revenu_median_menage": random.randint(25000, 60000),  # €/an
                    "revenu_moyen_menage": random.randint(30000, 70000),  # €/an
                    "niveau_vie_median": random.randint(20000, 50000),  # €/an
                    "annee": 2023
                },
                "densite_population": {
                    "population": random.randint(30000, 200000),  # Habitants
                    "densite_km2": random.randint(15000, 50000),  # Habitants/km²
                    "superficie_km2": round(random.uniform(1.0, 6.0), 2),  # km²
                    "annee": 2023
                }
            }
            
            # Prix/m² médian par mois (simulation avec tendance)
            base_price = random.uniform(8000, 15000)  # Prix de base selon l'arrondissement
            
            for year in years:
                for month in months:
                    # Simulation d'évolution avec légère hausse
                    trend = (year - 2022) * 0.02  # +2% par an
                    monthly_variation = random.uniform(-0.05, 0.05)
                    price = base_price * (1 + trend) * (1 + monthly_variation)
                    
                    arr_data["prix_m2_median"].append({
                        "date": f"{year}-{month:02d}-01",
                        "prix_m2": round(price, 2)
                    })
            
            # Typologie (répartition des logements)
            typologies = ["Studio", "T2", "T3", "T4", "T5+"]
            total = 100
            for i, typo in enumerate(typologies):
                if i == len(typologies) - 1:
                    percentage = total
                else:
                    percentage = random.uniform(5, 30)
                    total -= percentage
                arr_data["typologie"][typo] = round(percentage, 1)
            
            # Évolution annuelle
            for year in years:
                year_prices = [p["prix_m2"] for p in arr_data["prix_m2_median"] 
                              if p["date"].startswith(str(year))]
                arr_data["evolution"].append({
                    "annee": year,
                    "prix_m2_median": round(sum(year_prices) / len(year_prices), 2),
                    "nombre_transactions": random.randint(100, 500)
                })
            
            data["arrondissements"].append(arr_data)
        
        return data
    
    def fetch_real_estate_data(self) -> bool:
        """
        Récupère les données immobilières.
        Pour l'instant, génère des données d'exemple.
        """
        logger.info("Récupération des données immobilières...")
        
        # Générer des données d'exemple
        data = self.generate_sample_data()
        
        # Sauvegarder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"real_estate_data_{timestamp}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"[OK] Donnees immobilieres sauvegardees dans {filepath}")
        
        # Créer aussi un fichier "latest" pour l'API
        latest_filepath = self.output_dir / "real_estate_data_latest.json"
        with open(latest_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return True


def main():
    """Fonction principale."""
    fetcher = RealEstateDataFetcher()
    fetcher.fetch_real_estate_data()


if __name__ == "__main__":
    main()

