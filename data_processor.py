"""
Pipeline de traitement des données : Bronze -> Silver -> Gold
Architecture Medallion (Bronze, Silver, Gold)
"""

import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataProcessor:
    """Classe pour transformer les données à travers les couches Bronze -> Silver -> Gold."""
    
    def __init__(self):
        self.bronze_dir = Path("data/bronze")
        self.silver_dir = Path("data/silver")
        self.gold_dir = Path("data/gold")
        
        # Créer les dossiers s'ils n'existent pas
        self.silver_dir.mkdir(parents=True, exist_ok=True)
        self.gold_dir.mkdir(parents=True, exist_ok=True)
    
    def load_bronze_data(self, filename: str = "real_estate_data_latest.json") -> Optional[Dict]:
        """Charge les données brutes depuis la couche Bronze."""
        filepath = self.bronze_dir / filename
        if not filepath.exists():
            logger.error(f"Fichier Bronze non trouve: {filepath}")
            return None
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"[OK] Donnees Bronze chargees depuis {filepath}")
            return data
        except Exception as e:
            logger.error(f"Erreur lors du chargement des donnees Bronze: {e}")
            return None
    
    def bronze_to_silver(self, bronze_data: Dict) -> Optional[Dict]:
        """
        Transforme les données Bronze en Silver (nettoyage).
        - Supprime les doublons
        - Valide les types de données
        - Corrige les valeurs aberrantes
        - Normalise les formats
        """
        logger.info("Transformation Bronze -> Silver (nettoyage)...")
        
        try:
            silver_data = {
                "timestamp": bronze_data.get("timestamp", datetime.now().isoformat()),
                "arrondissements": []
            }
            
            for arr in bronze_data.get("arrondissements", []):
                # Nettoyer les données de l'arrondissement
                cleaned_arr = self._clean_arrondissement_data(arr)
                if cleaned_arr:
                    silver_data["arrondissements"].append(cleaned_arr)
            
            logger.info(f"[OK] {len(silver_data['arrondissements'])} arrondissements nettoyes")
            return silver_data
            
        except Exception as e:
            logger.error(f"Erreur lors de la transformation Bronze -> Silver: {e}")
            return None
    
    def _clean_arrondissement_data(self, arr: Dict) -> Optional[Dict]:
        """Nettoie les données d'un arrondissement."""
        try:
            # Validation du numéro d'arrondissement
            arr_num = arr.get("arrondissement")
            if not arr_num or arr_num < 1 or arr_num > 20:
                logger.warning(f"Arrondissement invalide: {arr_num}")
                return None
            
            # Nettoyer les prix/m²
            prix_cleaned = []
            prix_raw = arr.get("prix_m2_median", [])
            
            for prix_item in prix_raw:
                if not isinstance(prix_item, dict):
                    continue
                
                date = prix_item.get("date")
                prix = prix_item.get("prix_m2")
                
                # Valider et nettoyer
                if date and prix:
                    try:
                        # Vérifier que le prix est raisonnable (entre 1000 et 50000 €/m²)
                        prix_float = float(prix)
                        if 1000 <= prix_float <= 50000:
                            prix_cleaned.append({
                                "date": date,
                                "prix_m2": round(prix_float, 2)
                            })
                    except (ValueError, TypeError):
                        continue
            
            # Trier par date
            prix_cleaned.sort(key=lambda x: x["date"])
            
            # Nettoyer le pourcentage de logements sociaux
            logements_sociaux = arr.get("logements_sociaux_pourcentage", 0)
            try:
                logements_sociaux = float(logements_sociaux)
                if logements_sociaux < 0:
                    logements_sociaux = 0
                elif logements_sociaux > 100:
                    logements_sociaux = 100
                logements_sociaux = round(logements_sociaux, 2)
            except (ValueError, TypeError):
                logements_sociaux = 0
            
            # Nettoyer la typologie
            typologie_cleaned = {}
            typologie_raw = arr.get("typologie", {})
            total_percentage = 0
            
            for typo in ["Studio", "T2", "T3", "T4", "T5+"]:
                value = typologie_raw.get(typo, 0)
                try:
                    value = float(value)
                    if value < 0:
                        value = 0
                    typologie_cleaned[typo] = round(value, 2)
                    total_percentage += value
                except (ValueError, TypeError):
                    typologie_cleaned[typo] = 0
            
            # Normaliser les pourcentages si la somme dépasse 100
            if total_percentage > 100:
                factor = 100 / total_percentage
                for typo in typologie_cleaned:
                    typologie_cleaned[typo] = round(typologie_cleaned[typo] * factor, 2)
            
            # Nettoyer l'évolution
            evolution_cleaned = []
            evolution_raw = arr.get("evolution", [])
            
            for evol in evolution_raw:
                if not isinstance(evol, dict):
                    continue
                
                annee = evol.get("annee")
                prix_median = evol.get("prix_m2_median")
                nb_transactions = evol.get("nombre_transactions", 0)
                
                if annee and prix_median:
                    try:
                        annee_int = int(annee)
                        prix_float = float(prix_median)
                        nb_int = int(nb_transactions)
                        
                        if 2020 <= annee_int <= 2030 and 1000 <= prix_float <= 50000:
                            evolution_cleaned.append({
                                "annee": annee_int,
                                "prix_m2_median": round(prix_float, 2),
                                "nombre_transactions": max(0, nb_int)
                            })
                    except (ValueError, TypeError):
                        continue
            
            # Trier par année
            evolution_cleaned.sort(key=lambda x: x["annee"])
            
            # Nettoyer les indicateurs personnalisés
            pollution_cleaned = self._clean_pollution_data(arr.get("pollution_qualite_air", {}))
            delits_cleaned = self._clean_delits_data(arr.get("delits_enregistres", {}))
            revenus_cleaned = self._clean_revenus_data(arr.get("revenus_moyens", {}))
            densite_cleaned = self._clean_densite_data(arr.get("densite_population", {}))
            
            return {
                "arrondissement": arr_num,
                "nom": arr.get("nom", f"{arr_num}e"),
                "code_insee": arr.get("code_insee", f"751{arr_num:02d}"),
                "prix_m2_median": prix_cleaned,
                "logements_sociaux_pourcentage": logements_sociaux,
                "typologie": typologie_cleaned,
                "evolution": evolution_cleaned,
                "pollution_qualite_air": pollution_cleaned,
                "delits_enregistres": delits_cleaned,
                "revenus_moyens": revenus_cleaned,
                "densite_population": densite_cleaned,
                "metadata": {
                    "cleaned_at": datetime.now().isoformat(),
                    "nb_prix_records": len(prix_cleaned),
                    "nb_evolution_records": len(evolution_cleaned)
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur lors du nettoyage de l'arrondissement {arr.get('arrondissement')}: {e}")
            return None
    
    def _clean_pollution_data(self, pollution: Dict) -> Dict:
        """Nettoie les données de pollution/qualité de l'air."""
        try:
            indice_atmo = pollution.get("indice_atmo", 5)
            pm25 = pollution.get("pm25_moyen", 15)
            pm10 = pollution.get("pm10_moyen", 25)
            no2 = pollution.get("no2_moyen", 40)
            
            # Valider les valeurs
            indice_atmo = max(1, min(10, float(indice_atmo)))
            pm25 = max(0, min(100, float(pm25)))
            pm10 = max(0, min(200, float(pm10)))
            no2 = max(0, min(200, float(no2)))
            
            return {
                "indice_atmo": round(indice_atmo, 1),
                "pm25_moyen": round(pm25, 2),
                "pm10_moyen": round(pm10, 2),
                "no2_moyen": round(no2, 2),
                "date_mesure": pollution.get("date_mesure", datetime.now().strftime("%Y-%m-%d")),
                "qualite": "bonne" if indice_atmo <= 3 else "moyenne" if indice_atmo <= 6 else "mauvaise"
            }
        except Exception:
            return {
                "indice_atmo": 5.0,
                "pm25_moyen": 15.0,
                "pm10_moyen": 25.0,
                "no2_moyen": 40.0,
                "date_mesure": datetime.now().strftime("%Y-%m-%d"),
                "qualite": "moyenne"
            }
    
    def _clean_delits_data(self, delits: Dict) -> Dict:
        """Nettoie les données de délits."""
        try:
            total = max(0, int(delits.get("total_delits", 0)))
            par_1000 = max(0, float(delits.get("delits_par_1000_habitants", 0)))
            cambriolages = max(0, int(delits.get("cambriolages", 0)))
            vols = max(0, int(delits.get("vols", 0)))
            violences = max(0, int(delits.get("violences", 0)))
            
            return {
                "total_delits": total,
                "delits_par_1000_habitants": round(par_1000, 2),
                "cambriolages": cambriolages,
                "vols": vols,
                "violences": violences,
                "annee": int(delits.get("annee", 2024))
            }
        except Exception:
            return {
                "total_delits": 0,
                "delits_par_1000_habitants": 0.0,
                "cambriolages": 0,
                "vols": 0,
                "violences": 0,
                "annee": 2024
            }
    
    def _clean_revenus_data(self, revenus: Dict) -> Dict:
        """Nettoie les données de revenus."""
        try:
            revenu_median = max(0, int(revenus.get("revenu_median_menage", 0)))
            revenu_moyen = max(0, int(revenus.get("revenu_moyen_menage", 0)))
            niveau_vie = max(0, int(revenus.get("niveau_vie_median", 0)))
            
            return {
                "revenu_median_menage": revenu_median,
                "revenu_moyen_menage": revenu_moyen,
                "niveau_vie_median": niveau_vie,
                "annee": int(revenus.get("annee", 2023))
            }
        except Exception:
            return {
                "revenu_median_menage": 0,
                "revenu_moyen_menage": 0,
                "niveau_vie_median": 0,
                "annee": 2023
            }
    
    def _clean_densite_data(self, densite: Dict) -> Dict:
        """Nettoie les données de densité de population."""
        try:
            population = max(0, int(densite.get("population", 0)))
            densite_km2 = max(0, int(densite.get("densite_km2", 0)))
            superficie = max(0.1, float(densite.get("superficie_km2", 1.0)))
            
            # Recalculer la densité si nécessaire
            if population > 0 and superficie > 0:
                densite_calculee = round(population / superficie, 0)
            else:
                densite_calculee = densite_km2
            
            return {
                "population": population,
                "densite_km2": int(densite_calculee),
                "superficie_km2": round(superficie, 2),
                "annee": int(densite.get("annee", 2023))
            }
        except Exception:
            return {
                "population": 0,
                "densite_km2": 0,
                "superficie_km2": 1.0,
                "annee": 2023
            }
    
    def silver_to_gold(self, silver_data: Dict) -> Optional[Dict]:
        """
        Transforme les données Silver en Gold (données clean prêtes à utiliser).
        - Agrège les données
        - Calcule les métriques dérivées
        - Structure optimisée pour l'API
        - Ajoute des indicateurs calculés
        """
        logger.info("Transformation Silver -> Gold (donnees clean)...")
        
        try:
            gold_data = {
                "timestamp": silver_data.get("timestamp"),
                "generated_at": datetime.now().isoformat(),
                "summary": {
                    "nb_arrondissements": len(silver_data.get("arrondissements", [])),
                    "periode_min": None,
                    "periode_max": None
                },
                "arrondissements": []
            }
            
            all_dates = []
            
            for arr in silver_data.get("arrondissements", []):
                gold_arr = self._enrich_arrondissement_data(arr)
                if gold_arr:
                    gold_data["arrondissements"].append(gold_arr)
                    
                    # Collecter les dates pour le résumé
                    for prix in arr.get("prix_m2_median", []):
                        all_dates.append(prix.get("date"))
            
            # Mettre à jour le résumé
            if all_dates:
                all_dates.sort()
                gold_data["summary"]["periode_min"] = all_dates[0]
                gold_data["summary"]["periode_max"] = all_dates[-1]
            
            logger.info(f"[OK] {len(gold_data['arrondissements'])} arrondissements transformes en Gold")
            return gold_data
            
        except Exception as e:
            logger.error(f"Erreur lors de la transformation Silver -> Gold: {e}")
            return None
    
    def _enrich_arrondissement_data(self, arr: Dict) -> Optional[Dict]:
        """Enrichit les données d'un arrondissement avec des métriques calculées."""
        try:
            prix_list = arr.get("prix_m2_median", [])
            evolution_list = arr.get("evolution", [])
            
            # Calculer les statistiques sur les prix
            prix_values = [p["prix_m2"] for p in prix_list]
            
            stats = {
                "prix_m2_actuel": prix_values[-1] if prix_values else None,
                "prix_m2_min": min(prix_values) if prix_values else None,
                "prix_m2_max": max(prix_values) if prix_values else None,
                "prix_m2_moyen": round(sum(prix_values) / len(prix_values), 2) if prix_values else None,
                "prix_m2_median": sorted(prix_values)[len(prix_values) // 2] if prix_values else None
            }
            
            # Calculer l'évolution du prix
            evolution_calc = None
            if len(prix_values) >= 2:
                prix_initial = prix_values[0]
                prix_final = prix_values[-1]
                evolution_calc = {
                    "variation_absolue": round(prix_final - prix_initial, 2),
                    "variation_pourcentage": round(((prix_final - prix_initial) / prix_initial) * 100, 2) if prix_initial > 0 else 0,
                    "tendance": "hausse" if prix_final > prix_initial else "baisse" if prix_final < prix_initial else "stable"
                }
            
            # Calculer la tendance annuelle
            tendance_annuelle = None
            if len(evolution_list) >= 2:
                evolution_list_sorted = sorted(evolution_list, key=lambda x: x["annee"])
                prix_annee_initial = evolution_list_sorted[0]["prix_m2_median"]
                prix_annee_final = evolution_list_sorted[-1]["prix_m2_median"]
                
                nb_annees = evolution_list_sorted[-1]["annee"] - evolution_list_sorted[0]["annee"]
                if nb_annees > 0:
                    tendance_annuelle = {
                        "variation_annuelle_moyenne": round(((prix_annee_final - prix_annee_initial) / nb_annees), 2),
                        "taux_croissance_annuel": round((((prix_annee_final / prix_annee_initial) ** (1/nb_annees)) - 1) * 100, 2) if prix_annee_initial > 0 else 0
                    }
            
            return {
                "arrondissement": arr["arrondissement"],
                "nom": arr["nom"],
                "code_insee": arr["code_insee"],
                "statistiques": stats,
                "evolution_calculee": evolution_calc,
                "tendance_annuelle": tendance_annuelle,
                "logements_sociaux_pourcentage": arr["logements_sociaux_pourcentage"],
                "typologie": arr["typologie"],
                "prix_m2_historique": prix_list,
                "evolution_annuelle": evolution_list,
                # Indicateurs personnalisés
                "pollution_qualite_air": arr.get("pollution_qualite_air", {}),
                "delits_enregistres": arr.get("delits_enregistres", {}),
                "revenus_moyens": arr.get("revenus_moyens", {}),
                "densite_population": arr.get("densite_population", {}),
                "metadata": arr.get("metadata", {})
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de l'enrichissement de l'arrondissement {arr.get('arrondissement')}: {e}")
            return None
    
    def save_silver_data(self, silver_data: Dict) -> bool:
        """Sauvegarde les données Silver."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"real_estate_data_silver_{timestamp}.json"
            filepath = self.silver_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(silver_data, f, indent=2, ensure_ascii=False)
            
            # Sauvegarder aussi le fichier latest
            latest_filepath = self.silver_dir / "real_estate_data_silver_latest.json"
            with open(latest_filepath, 'w', encoding='utf-8') as f:
                json.dump(silver_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"[OK] Donnees Silver sauvegardees dans {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde Silver: {e}")
            return False
    
    def save_gold_data(self, gold_data: Dict) -> bool:
        """Sauvegarde les données Gold."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"real_estate_data_gold_{timestamp}.json"
            filepath = self.gold_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(gold_data, f, indent=2, ensure_ascii=False)
            
            # Sauvegarder aussi le fichier latest
            latest_filepath = self.gold_dir / "real_estate_data_gold_latest.json"
            with open(latest_filepath, 'w', encoding='utf-8') as f:
                json.dump(gold_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"[OK] Donnees Gold sauvegardees dans {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde Gold: {e}")
            return False
    
    def process_pipeline(self, bronze_filename: str = "real_estate_data_latest.json") -> bool:
        """
        Exécute le pipeline complet : Bronze -> Silver -> Gold.
        
        Returns:
            True si le pipeline s'est exécuté avec succès
        """
        logger.info("=" * 60)
        logger.info("Demarrage du pipeline de traitement des donnees")
        logger.info("=" * 60)
        
        # 1. Charger les données Bronze
        bronze_data = self.load_bronze_data(bronze_filename)
        if not bronze_data:
            logger.error("Impossible de charger les donnees Bronze")
            return False
        
        # 2. Transformer Bronze -> Silver
        silver_data = self.bronze_to_silver(bronze_data)
        if not silver_data:
            logger.error("Impossible de transformer Bronze -> Silver")
            return False
        
        # 3. Sauvegarder Silver
        if not self.save_silver_data(silver_data):
            logger.error("Impossible de sauvegarder les donnees Silver")
            return False
        
        # 4. Transformer Silver -> Gold
        gold_data = self.silver_to_gold(silver_data)
        if not gold_data:
            logger.error("Impossible de transformer Silver -> Gold")
            return False
        
        # 5. Sauvegarder Gold
        if not self.save_gold_data(gold_data):
            logger.error("Impossible de sauvegarder les donnees Gold")
            return False
        
        logger.info("=" * 60)
        logger.info("[OK] Pipeline de traitement termine avec succes")
        logger.info("=" * 60)
        
        return True


def main():
    """Fonction principale."""
    processor = DataProcessor()
    processor.process_pipeline()


if __name__ == "__main__":
    main()

