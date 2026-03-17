from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict
from datetime import datetime
import json
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Real Estate API",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data/gold")
LATEST_DATA_FILE = DATA_DIR / "real_estate_data_gold_latest.json"


def load_data() -> Dict:
    try:
        if not LATEST_DATA_FILE.exists():
            raise FileNotFoundError("Aucune donnée Gold disponible. Exécutez: python pipeline.py")
        
        with open(LATEST_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Erreur lors du chargement des données: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur de chargement des données: {str(e)}")


@app.get("/")
async def root():
    """Endpoint racine."""
    return {
        "message": "API Real Estate Dashboard - FastAPI",
        "version": "2.0.0",
        "architecture": "Medallion (Bronze -> Silver -> Gold)",
        "data_layer": "Gold (données clean et enrichies)",
        "endpoints": {
            "/arrondissements": "Liste tous les arrondissements",
            "/arrondissements/{num}": "Détails d'un arrondissement",
            "/prix-m2": "Prix/m² avec statistiques (min, max, moyen, médian)",
            "/logements-sociaux": "Part de logements sociaux",
            "/typologie": "Typologie des logements",
            "/evolution": "Évolution dans le temps avec tendances",
            "/compare": "Comparer deux arrondissements",
            "/comparaison": "Comparer deux arrondissements (alias)",
            "/prix": "Prix médian par arrondissement et par année (avec variation annuelle %)",
            "/timeline": "Timeline (évolution temporelle) pour un arrondissement",
            "/summary": "Résumé global des données",
            "/pollution": "Pollution / Qualité de l'air",
            "/delits": "Délits enregistrés",
            "/revenus": "Revenus moyens",
            "/densite": "Densité de population"
        }
    }


@app.get("/arrondissements")
async def get_arrondissements():
    """Retourne la liste de tous les arrondissements avec leurs données."""
    data = load_data()
    return {
        "arrondissements": data.get("arrondissements", []),
        "timestamp": data.get("timestamp")
    }


@app.get("/arrondissements/{arr_num}")
async def get_arrondissement(arr_num: int):
    """Retourne les données détaillées d'un arrondissement."""
    if arr_num < 1 or arr_num > 20:
        raise HTTPException(status_code=400, detail="Numéro d'arrondissement invalide (1-20)")
    
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    arr_data = next((arr for arr in arrondissements if arr["arrondissement"] == arr_num), None)
    
    if not arr_data:
        raise HTTPException(status_code=404, detail=f"Arrondissement {arr_num} non trouvé")
    
    return arr_data


@app.get("/prix-m2")
async def get_prix_m2(arrondissement: Optional[int] = None, date: Optional[str] = None):
    """
    Retourne les prix/m² médians (données Gold avec statistiques).
    
    Query params:
    - arrondissement: Filtrer par arrondissement (1-20)
    - date: Filtrer par date (format: YYYY-MM)
    """
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        stats = arr.get("statistiques", {})
        prix_historique = arr.get("prix_m2_historique", [])
        
        if date:
            prix_historique = [p for p in prix_historique if p["date"].startswith(date)]
        
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "prix_m2_actuel": stats.get("prix_m2_actuel"),
            "prix_m2_median": stats.get("prix_m2_median"),
            "prix_m2_min": stats.get("prix_m2_min"),
            "prix_m2_max": stats.get("prix_m2_max"),
            "prix_m2_moyen": stats.get("prix_m2_moyen"),
            "historique": prix_historique,
            "evolution": arr.get("evolution_calculee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/prix")
async def get_prix(annee: Optional[int] = None, arrondissement: Optional[int] = None):
    """
    Retourne le prix médian par arrondissement et par année.
    
    Query params:
    - annee: Filtrer par année (ex: 2023)
    - arrondissement: Filtrer par arrondissement (1-20)
    """
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        evolution_annuelle = arr.get("evolution_annuelle", [])
        
        if annee:
            # Filtrer par année
            evolution_filtered = [e for e in evolution_annuelle if e.get("annee") == annee]
            if not evolution_filtered:
                continue
            
            for evol in evolution_filtered:
                result.append({
                    "arrondissement": arr["arrondissement"],
                    "nom": arr["nom"],
                    "annee": evol.get("annee"),
                    "prix_m2_median": evol.get("prix_m2_median"),
                    "nombre_transactions": evol.get("nombre_transactions")
                })
        else:
            # Retourner toutes les années
            for evol in evolution_annuelle:
                # Calculer la variation annuelle
                annee_courante = evol.get("annee")
                prix_courant = evol.get("prix_m2_median")
                
                # Trouver l'année précédente
                evolution_sorted = sorted(evolution_annuelle, key=lambda x: x.get("annee", 0))
                index_courant = next((i for i, e in enumerate(evolution_sorted) if e.get("annee") == annee_courante), -1)
                
                variation_annuelle = None
                if index_courant > 0:
                    prix_precedent = evolution_sorted[index_courant - 1].get("prix_m2_median")
                    if prix_precedent and prix_precedent > 0:
                        variation_annuelle = round(((prix_courant - prix_precedent) / prix_precedent) * 100, 2)
                
                result.append({
                    "arrondissement": arr["arrondissement"],
                    "nom": arr["nom"],
                    "annee": annee_courante,
                    "prix_m2_median": prix_courant,
                    "nombre_transactions": evol.get("nombre_transactions"),
                    "variation_annuelle_pourcentage": variation_annuelle
                })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/logements-sociaux")
async def get_logements_sociaux(arrondissement: Optional[int] = None):
    """Retourne la part de logements sociaux par arrondissement."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "logements_sociaux_pourcentage": arr.get("logements_sociaux_pourcentage", 0)
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/typologie")
async def get_typologie(arrondissement: Optional[int] = None):
    """Retourne la répartition détaillée par typologie de logements (appartement/maison, nombre de pièces)."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        typologie = arr.get("typologie", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "type_logement": typologie.get("type_logement", {}),
            "repartition_pieces": typologie.get("repartition_pieces", {}),
            "detail_pieces": typologie.get("detail_pieces", {}),
            "statistiques": typologie.get("statistiques", {})
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/evolution")
async def get_evolution(arrondissement: Optional[int] = None):
    """Retourne l'évolution des prix dans le temps (données Gold enrichies)."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "evolution_annuelle": arr.get("evolution_annuelle", []),
            "evolution_calculee": arr.get("evolution_calculee"),
            "tendance_annuelle": arr.get("tendance_annuelle")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/comparaison")
async def comparaison_arrondissements(arr1: int, arr2: int):
    """
    Compare deux arrondissements (alias de /compare).
    
    Query params:
    - arr1: Numéro du premier arrondissement (1-20)
    - arr2: Numéro du deuxième arrondissement (1-20)
    """
    return await compare_arrondissements_internal(arr1, arr2)


@app.get("/compare")
async def compare_arrondissements(arr1: int, arr2: int):
    """
    Compare deux arrondissements.
    
    Query params:
    - arr1: Numéro du premier arrondissement (1-20)
    - arr2: Numéro du deuxième arrondissement (1-20)
    """
    return await compare_arrondissements_internal(arr1, arr2)


async def compare_arrondissements_internal(arr1: int, arr2: int):
    """
    Compare deux arrondissements.
    
    Query params:
    - arr1: Numéro du premier arrondissement (1-20)
    - arr2: Numéro du deuxième arrondissement (1-20)
    """
    if arr1 < 1 or arr1 > 20 or arr2 < 1 or arr2 > 20:
        raise HTTPException(status_code=400, detail="Numéro d'arrondissement invalide (1-20)")
    
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    arr1_data = next((arr for arr in arrondissements if arr["arrondissement"] == arr1), None)
    arr2_data = next((arr for arr in arrondissements if arr["arrondissement"] == arr2), None)
    
    if not arr1_data or not arr2_data:
        raise HTTPException(status_code=404, detail="Arrondissement non trouvé")
    
    # Récupérer les statistiques (données Gold)
    stats1 = arr1_data.get("statistiques", {})
    stats2 = arr2_data.get("statistiques", {})
    
    latest_prix1 = stats1.get("prix_m2_actuel")
    latest_prix2 = stats2.get("prix_m2_actuel")
    
    comparison = {
        "arrondissement_1": {
            "num": arr1,
            "nom": arr1_data["nom"],
            "statistiques": stats1,
            "prix_m2_actuel": latest_prix1,
            "logements_sociaux_pourcentage": arr1_data.get("logements_sociaux_pourcentage", 0),
            "typologie": arr1_data.get("typologie", {}),
            "evolution": arr1_data.get("evolution_calculee"),
            "tendance_annuelle": arr1_data.get("tendance_annuelle")
        },
        "arrondissement_2": {
            "num": arr2,
            "nom": arr2_data["nom"],
            "statistiques": stats2,
            "prix_m2_actuel": latest_prix2,
            "logements_sociaux_pourcentage": arr2_data.get("logements_sociaux_pourcentage", 0),
            "typologie": arr2_data.get("typologie", {}),
            "evolution": arr2_data.get("evolution_calculee"),
            "tendance_annuelle": arr2_data.get("tendance_annuelle")
        },
        "differences": {
            "prix_m2_diff": round(latest_prix1 - latest_prix2, 2) if latest_prix1 and latest_prix2 else None,
            "prix_m2_diff_pourcentage": round(((latest_prix1 - latest_prix2) / latest_prix2 * 100), 2) if latest_prix1 and latest_prix2 else None,
            "logements_sociaux_diff": round(arr1_data.get("logements_sociaux_pourcentage", 0) - arr2_data.get("logements_sociaux_pourcentage", 0), 2)
        }
    }
    
    return comparison


@app.get("/summary")
async def get_summary():
    """Retourne un résumé global des données Gold."""
    data = load_data()
    summary = data.get("summary", {})
    arrondissements = data.get("arrondissements", [])
    
    # Calculer des statistiques globales
    all_prix_actuels = [
        arr.get("statistiques", {}).get("prix_m2_actuel")
        for arr in arrondissements
        if arr.get("statistiques", {}).get("prix_m2_actuel")
    ]
    
    global_stats = {}
    if all_prix_actuels:
        global_stats = {
            "prix_m2_moyen_global": round(sum(all_prix_actuels) / len(all_prix_actuels), 2),
            "prix_m2_min_global": min(all_prix_actuels),
            "prix_m2_max_global": max(all_prix_actuels),
            "prix_m2_median_global": sorted(all_prix_actuels)[len(all_prix_actuels) // 2]
        }
    
    return {
        "summary": summary,
        "global_stats": global_stats,
        "nb_arrondissements": len(arrondissements),
        "timestamp": data.get("timestamp"),
        "generated_at": data.get("generated_at")
    }


@app.get("/pollution")
async def get_pollution(arrondissement: Optional[int] = None):
    """Retourne les données de pollution / qualité de l'air."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        pollution = arr.get("pollution_qualite_air", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "indice_atmo": pollution.get("indice_atmo"),
            "pm25_moyen": pollution.get("pm25_moyen"),
            "pm10_moyen": pollution.get("pm10_moyen"),
            "no2_moyen": pollution.get("no2_moyen"),
            "qualite": pollution.get("qualite"),
            "date_mesure": pollution.get("date_mesure")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/delits")
async def get_delits(arrondissement: Optional[int] = None):
    """Retourne les données de délits enregistrés."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        delits = arr.get("delits_enregistres", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "total_delits": delits.get("total_delits"),
            "delits_par_1000_habitants": delits.get("delits_par_1000_habitants"),
            "cambriolages": delits.get("cambriolages"),
            "vols": delits.get("vols"),
            "violences": delits.get("violences"),
            "annee": delits.get("annee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/revenus")
async def get_revenus(arrondissement: Optional[int] = None):
    """Retourne les données de revenus moyens."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        revenus = arr.get("revenus_moyens", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "revenu_median_menage": revenus.get("revenu_median_menage"),
            "revenu_moyen_menage": revenus.get("revenu_moyen_menage"),
            "niveau_vie_median": revenus.get("niveau_vie_median"),
            "annee": revenus.get("annee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/densite")
async def get_densite(arrondissement: Optional[int] = None):
    """Retourne les données de densité de population."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        densite = arr.get("densite_population", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "population": densite.get("population"),
            "densite_km2": densite.get("densite_km2"),
            "superficie_km2": densite.get("superficie_km2"),
            "annee": densite.get("annee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/vegetation")
async def get_vegetation(arrondissement: Optional[int] = None):
    """Retourne les données de végétation et arbres."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        vegetation = arr.get("vegetation_arbres", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "nombre_arbres": vegetation.get("nombre_arbres"),
            "surface_espaces_verts_ha": vegetation.get("surface_espaces_verts_ha"),
            "pourcentage_vegetation": vegetation.get("pourcentage_vegetation"),
            "arbres_par_km2": vegetation.get("arbres_par_km2"),
            "parcs_et_jardins": vegetation.get("parcs_et_jardins"),
            "annee": vegetation.get("annee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/transports")
async def get_transports(arrondissement: Optional[int] = None):
    """Retourne les données de transports publics."""
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    result = []
    for arr in arrondissements:
        if arrondissement and arr["arrondissement"] != arrondissement:
            continue
        
        transports = arr.get("transports_publics", {})
        result.append({
            "arrondissement": arr["arrondissement"],
            "nom": arr["nom"],
            "stations_metro": transports.get("stations_metro"),
            "stations_rer": transports.get("stations_rer"),
            "arrets_bus": transports.get("arrets_bus"),
            "lignes_metro": transports.get("lignes_metro"),
            "lignes_bus": transports.get("lignes_bus"),
            "total_transports": transports.get("total_transports"),
            "annee": transports.get("annee")
        })
    
    return {"data": result, "timestamp": data.get("timestamp")}


@app.get("/timeline")
async def get_timeline(arr: int):
    """
    Retourne la timeline (évolution temporelle) pour un arrondissement.
    
    Query params:
    - arr: Numéro de l'arrondissement (1-20)
    """
    if arr < 1 or arr > 20:
        raise HTTPException(status_code=400, detail="Numéro d'arrondissement invalide (1-20)")
    
    data = load_data()
    arrondissements = data.get("arrondissements", [])
    
    arr_data = next((a for a in arrondissements if a["arrondissement"] == arr), None)
    
    if not arr_data:
        raise HTTPException(status_code=404, detail=f"Arrondissement {arr} non trouvé")
    
    # Récupérer l'historique des prix
    prix_historique = arr_data.get("prix_m2_historique", [])
    
    # Organiser par année et mois
    timeline_data = []
    for prix in prix_historique:
        date_str = prix.get("date", "")
        if date_str:
            year = int(date_str.split("-")[0])
            month = int(date_str.split("-")[1])
            timeline_data.append({
                "date": date_str,
                "annee": year,
                "mois": month,
                "prix_m2": prix.get("prix_m2")
            })
    
    # Trier par date
    timeline_data.sort(key=lambda x: (x["annee"], x["mois"]))
    
    # Calculer les variations
    for i in range(1, len(timeline_data)):
        prix_actuel = timeline_data[i]["prix_m2"]
        prix_precedent = timeline_data[i-1]["prix_m2"]
        if prix_precedent and prix_precedent > 0:
            timeline_data[i]["variation_mensuelle"] = round(((prix_actuel - prix_precedent) / prix_precedent) * 100, 2)
        else:
            timeline_data[i]["variation_mensuelle"] = None
    
    return {
        "arrondissement": arr,
        "nom": arr_data["nom"],
        "timeline": timeline_data,
        "evolution_calculee": arr_data.get("evolution_calculee"),
        "tendance_annuelle": arr_data.get("tendance_annuelle")
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

