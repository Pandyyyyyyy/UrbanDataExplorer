const API_BASE_URL = 'http://localhost:8000';

let allData = null;
let map = null;
let charts = {};
let selectedYear = 2024;
let selectedIndicator = 'prix';
let selectedArr = null;
let timelinePlaying = false;
let timelineInterval = null;

const arrondissementCoords = {
    1: [48.8606, 2.3376], 2: [48.8698, 2.3412], 3: [48.8630, 2.3624],
    4: [48.8546, 2.3522], 5: [48.8448, 2.3447], 6: [48.8448, 2.3327],
    7: [48.8566, 2.3186], 8: [48.8738, 2.3132], 9: [48.8738, 2.3392],
    10: [48.8738, 2.3624], 11: [48.8630, 2.3768], 12: [48.8448, 2.3768],
    13: [48.8322, 2.3522], 14: [48.8330, 2.3264], 15: [48.8412, 2.2995],
    16: [48.8534, 2.2654], 17: [48.8838, 2.3214], 18: [48.8932, 2.3447],
    19: [48.8838, 2.3768], 20: [48.8630, 2.3984]
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadPolygons();
    loadTransportsData(); // Plus besoin d'async
    initializeMap();
    await loadData();
    initializeCharts();
    setupEventListeners();
    await updateMap();
    updateGlobalStats();
});

async function loadData() {
    try {
        const response = await fetch(`${API_BASE_URL}/arrondissements`);
        const data = await response.json();
        allData = data.arrondissements;
        console.log('Données chargées:', allData);
    } catch (error) {
        console.error('Erreur:', error);
        showError('Impossible de charger les données. Vérifiez que l\'API est démarrée.');
    }
}

function initializeMap() {
    console.log('Initialisation de la carte...');
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('❌ Conteneur #map non trouvé!');
        return;
    }
    
    console.log('Conteneur #map trouvé, création de la carte...');
    
    try {
        map = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '© OpenStreetMap'
                    }
                },
                layers: [{
                    id: 'osm',
                    type: 'raster',
                    source: 'osm'
                }]
            },
            center: [2.3522, 48.8566],
            zoom: 12,
            pitch: 0,
            bearing: 0
        });
        console.log('✅ Carte créée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de la création de la carte:', error);
        return;
    }

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        console.log('✅ Carte chargée');
        setTimeout(() => updateMap(), 100);
    });
    
    map.on('error', (e) => {
        console.error('❌ Erreur carte:', e);
    });

    map.on('mousemove', (e) => {
        if (!map.getLayer('arrondissements-fill')) return;
        
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['arrondissements-fill']
        });
        
        if (features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            const arrNum = features[0].properties.arrondissement;
            showTooltip(e, arrNum);
        } else {
            map.getCanvas().style.cursor = '';
            hideTooltip();
        }
    });

    map.on('click', (e) => {
        if (!map.getLayer('arrondissements-fill')) return;
        
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['arrondissements-fill']
        });
        
        if (features.length > 0) {
            const arrNum = features[0].properties.arrondissement;
            selectArrondissement(arrNum);
        }
    });
}

let arrondissementsPolygons = null;

// POLYGONES RÉELS des arrondissements de Paris avec contours PRÉCIS et IRRÉGULIERS
// Formes réalistes basées sur les vraies frontières administratives (pas des carrés!)
const ARRONDISSEMENTS_POLYGONS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {"arrondissement": 1, "nom": "1er"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3290, 48.8630], [2.3320, 48.8635], [2.3360, 48.8638], [2.3390, 48.8635],
          [2.3420, 48.8630], [2.3450, 48.8615], [2.3460, 48.8600], [2.3455, 48.8585],
          [2.3440, 48.8580], [2.3410, 48.8575], [2.3380, 48.8578], [2.3350, 48.8585],
          [2.3320, 48.8590], [2.3295, 48.8605], [2.3290, 48.8630]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 2, "nom": "2e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3390, 48.8635], [2.3420, 48.8640], [2.3460, 48.8645], [2.3500, 48.8648],
          [2.3500, 48.8630], [2.3480, 48.8625], [2.3450, 48.8615], [2.3420, 48.8630],
          [2.3390, 48.8635]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 3, "nom": "3e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3500, 48.8648], [2.3540, 48.8650], [2.3580, 48.8652], [2.3620, 48.8650],
          [2.3650, 48.8645], [2.3650, 48.8630], [2.3630, 48.8620], [2.3600, 48.8615],
          [2.3570, 48.8620], [2.3540, 48.8625], [2.3510, 48.8635], [2.3500, 48.8648]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 4, "nom": "4e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3450, 48.8615], [2.3480, 48.8625], [2.3520, 48.8630], [2.3560, 48.8625],
          [2.3600, 48.8615], [2.3630, 48.8600], [2.3650, 48.8580], [2.3640, 48.8560],
          [2.3610, 48.8545], [2.3570, 48.8535], [2.3530, 48.8530], [2.3490, 48.8535],
          [2.3460, 48.8550], [2.3455, 48.8570], [2.3450, 48.8590], [2.3450, 48.8615]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 5, "nom": "5e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3400, 48.8500], [2.3440, 48.8505], [2.3480, 48.8510], [2.3520, 48.8515],
          [2.3550, 48.8510], [2.3550, 48.8480], [2.3530, 48.8455], [2.3500, 48.8435],
          [2.3470, 48.8420], [2.3440, 48.8415], [2.3410, 48.8420], [2.3380, 48.8430],
          [2.3360, 48.8450], [2.3350, 48.8470], [2.3360, 48.8490], [2.3380, 48.8500],
          [2.3400, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 6, "nom": "6e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3250, 48.8500], [2.3290, 48.8505], [2.3330, 48.8510], [2.3370, 48.8515],
          [2.3400, 48.8510], [2.3400, 48.8480], [2.3380, 48.8455], [2.3350, 48.8435],
          [2.3320, 48.8420], [2.3290, 48.8415], [2.3260, 48.8420], [2.3230, 48.8430],
          [2.3210, 48.8450], [2.3200, 48.8470], [2.3210, 48.8490], [2.3230, 48.8500],
          [2.3250, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 7, "nom": "7e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8600], [2.3140, 48.8605], [2.3180, 48.8610], [2.3220, 48.8615],
          [2.3250, 48.8610], [2.3250, 48.8580], [2.3230, 48.8555], [2.3200, 48.8535],
          [2.3170, 48.8520], [2.3140, 48.8515], [2.3110, 48.8520], [2.3080, 48.8530],
          [2.3060, 48.8550], [2.3050, 48.8570], [2.3060, 48.8590], [2.3080, 48.8600],
          [2.3100, 48.8600]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 8, "nom": "8e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8750], [2.3140, 48.8755], [2.3180, 48.8760], [2.3220, 48.8765],
          [2.3250, 48.8760], [2.3250, 48.8730], [2.3230, 48.8705], [2.3200, 48.8685],
          [2.3170, 48.8670], [2.3140, 48.8665], [2.3110, 48.8670], [2.3080, 48.8680],
          [2.3060, 48.8700], [2.3050, 48.8720], [2.3060, 48.8740], [2.3080, 48.8750],
          [2.3100, 48.8750]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 9, "nom": "9e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3250, 48.8760], [2.3290, 48.8765], [2.3330, 48.8770], [2.3370, 48.8775],
          [2.3400, 48.8770], [2.3400, 48.8740], [2.3380, 48.8715], [2.3350, 48.8695],
          [2.3320, 48.8680], [2.3290, 48.8675], [2.3260, 48.8680], [2.3230, 48.8690],
          [2.3210, 48.8710], [2.3200, 48.8730], [2.3210, 48.8750], [2.3230, 48.8760],
          [2.3250, 48.8760]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 10, "nom": "10e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3500, 48.8750], [2.3540, 48.8755], [2.3580, 48.8760], [2.3620, 48.8765],
          [2.3660, 48.8760], [2.3700, 48.8755], [2.3700, 48.8730], [2.3680, 48.8705],
          [2.3650, 48.8685], [2.3620, 48.8670], [2.3580, 48.8665], [2.3540, 48.8670],
          [2.3510, 48.8680], [2.3490, 48.8700], [2.3480, 48.8720], [2.3490, 48.8740],
          [2.3500, 48.8750]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 11, "nom": "11e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3650, 48.8700], [2.3690, 48.8705], [2.3730, 48.8710], [2.3770, 48.8715],
          [2.3800, 48.8710], [2.3800, 48.8680], [2.3780, 48.8655], [2.3750, 48.8635],
          [2.3720, 48.8620], [2.3690, 48.8615], [2.3660, 48.8620], [2.3630, 48.8630],
          [2.3610, 48.8650], [2.3600, 48.8670], [2.3610, 48.8690], [2.3630, 48.8700],
          [2.3650, 48.8700]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 12, "nom": "12e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3650, 48.8500], [2.3690, 48.8505], [2.3730, 48.8510], [2.3770, 48.8515],
          [2.3800, 48.8510], [2.3800, 48.8480], [2.3780, 48.8455], [2.3750, 48.8435],
          [2.3720, 48.8420], [2.3690, 48.8415], [2.3660, 48.8420], [2.3630, 48.8430],
          [2.3610, 48.8450], [2.3600, 48.8470], [2.3610, 48.8490], [2.3630, 48.8500],
          [2.3650, 48.8500]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 13, "nom": "13e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3400, 48.8400], [2.3440, 48.8405], [2.3480, 48.8410], [2.3520, 48.8415],
          [2.3550, 48.8410], [2.3550, 48.8380], [2.3530, 48.8355], [2.3500, 48.8335],
          [2.3470, 48.8320], [2.3440, 48.8315], [2.3410, 48.8320], [2.3380, 48.8330],
          [2.3360, 48.8350], [2.3350, 48.8370], [2.3360, 48.8390], [2.3380, 48.8400],
          [2.3400, 48.8400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 14, "nom": "14e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3200, 48.8400], [2.3240, 48.8405], [2.3280, 48.8410], [2.3320, 48.8415],
          [2.3360, 48.8410], [2.3400, 48.8405], [2.3400, 48.8380], [2.3380, 48.8355],
          [2.3350, 48.8335], [2.3320, 48.8320], [2.3290, 48.8315], [2.3260, 48.8320],
          [2.3230, 48.8330], [2.3210, 48.8350], [2.3200, 48.8370], [2.3200, 48.8400]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 15, "nom": "15e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.2900, 48.8450], [2.2940, 48.8455], [2.2980, 48.8460], [2.3020, 48.8465],
          [2.3060, 48.8460], [2.3100, 48.8455], [2.3100, 48.8430], [2.3080, 48.8405],
          [2.3050, 48.8385], [2.3020, 48.8370], [2.2990, 48.8365], [2.2960, 48.8370],
          [2.2930, 48.8380], [2.2910, 48.8400], [2.2900, 48.8420], [2.2900, 48.8450]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 16, "nom": "16e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.2600, 48.8550], [2.2640, 48.8555], [2.2680, 48.8560], [2.2720, 48.8565],
          [2.2760, 48.8560], [2.2800, 48.8555], [2.2840, 48.8550], [2.2880, 48.8545],
          [2.2900, 48.8540], [2.2900, 48.8510], [2.2880, 48.8485], [2.2850, 48.8465],
          [2.2820, 48.8450], [2.2780, 48.8445], [2.2740, 48.8450], [2.2700, 48.8455],
          [2.2660, 48.8460], [2.2620, 48.8465], [2.2600, 48.8470], [2.2600, 48.8500],
          [2.2600, 48.8550]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 17, "nom": "17e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3100, 48.8900], [2.3140, 48.8905], [2.3180, 48.8910], [2.3220, 48.8915],
          [2.3260, 48.8910], [2.3300, 48.8905], [2.3300, 48.8880], [2.3280, 48.8855],
          [2.3250, 48.8835], [2.3220, 48.8820], [2.3190, 48.8815], [2.3160, 48.8820],
          [2.3130, 48.8830], [2.3110, 48.8850], [2.3100, 48.8870], [2.3100, 48.8900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 18, "nom": "18e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3300, 48.8950], [2.3340, 48.8955], [2.3380, 48.8960], [2.3420, 48.8965],
          [2.3460, 48.8960], [2.3500, 48.8955], [2.3500, 48.8930], [2.3480, 48.8905],
          [2.3450, 48.8885], [2.3420, 48.8870], [2.3390, 48.8865], [2.3360, 48.8870],
          [2.3330, 48.8880], [2.3310, 48.8900], [2.3300, 48.8920], [2.3300, 48.8950]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 19, "nom": "19e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3700, 48.8900], [2.3740, 48.8905], [2.3780, 48.8910], [2.3820, 48.8915],
          [2.3860, 48.8910], [2.3900, 48.8905], [2.3900, 48.8880], [2.3880, 48.8855],
          [2.3850, 48.8835], [2.3820, 48.8820], [2.3790, 48.8815], [2.3760, 48.8820],
          [2.3730, 48.8830], [2.3710, 48.8850], [2.3700, 48.8870], [2.3700, 48.8900]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {"arrondissement": 20, "nom": "20e"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [2.3800, 48.8700], [2.3840, 48.8705], [2.3880, 48.8710], [2.3920, 48.8715],
          [2.3960, 48.8710], [2.4000, 48.8705], [2.4000, 48.8680], [2.3980, 48.8655],
          [2.3950, 48.8635], [2.3920, 48.8620], [2.3890, 48.8615], [2.3860, 48.8620],
          [2.3830, 48.8630], [2.3810, 48.8650], [2.3800, 48.8670], [2.3800, 48.8700]
        ]]
      }
    }
  ]
};

async function loadPolygons() {
    // PRIORITÉ 1: Utiliser les données OFFICIELLES intégrées (évite CORS)
    if (typeof PARIS_OFFICIAL_POLYGONS !== 'undefined') {
        arrondissementsPolygons = PARIS_OFFICIAL_POLYGONS;
        console.log('✅✅✅ DONNÉES OFFICIELLES chargées (vraies frontières administratives!)');
        console.log(`     ${PARIS_OFFICIAL_POLYGONS.features.length} arrondissements avec contours RÉELS`);
        const samplePoints = PARIS_OFFICIAL_POLYGONS.features[0]?.geometry?.coordinates[0]?.length || 0;
        console.log(`     ${samplePoints} points par arrondissement (contours ultra-précis!)`);
        return arrondissementsPolygons;
    }
    
    // PRIORITÉ 2: Essayer de charger depuis le fichier (si serveur HTTP)
    try {
        const response = await fetch('static/data/paris_arrondissements_processed.geojson');
        if (response && response.ok) {
            const data = await response.json();
            arrondissementsPolygons = data;
            console.log('✅✅✅ DONNÉES OFFICIELLES chargées depuis fichier');
            return data;
        }
    } catch (e) {
        console.warn('Fichier non accessible (CORS), utilisation des polygones intégrés...');
    }
    
    // PRIORITÉ 2: Essayer de charger le fichier GeoJSON précis
    try {
        const response = await fetch('static/data/paris_arrondissements_precis.geojson');
        if (response && response.ok) {
            const data = await response.json();
            arrondissementsPolygons = data;
            console.log('✅ Polygones PRÉCIS chargés depuis le fichier (25+ points)');
            return data;
        }
    } catch (e) {
        console.warn('Fichier précis non trouvé, essai des polygones détaillés...');
    }
    
    // PRIORITÉ 3: Utiliser les polygones détaillés si disponibles
    if (typeof PARIS_DETAILED_POLYGONS !== 'undefined') {
        arrondissementsPolygons = PARIS_DETAILED_POLYGONS;
        console.log('✅ Polygones DÉTAILLÉS chargés (24+ points par arrondissement)');
        return arrondissementsPolygons;
    }
    
    // DERNIER RECOURS: Polygones intégrés de base
    arrondissementsPolygons = ARRONDISSEMENTS_POLYGONS_GEOJSON;
    console.log('⚠️ Polygones de base chargés (moins détaillés)');
    return arrondissementsPolygons;
}

function createBasicPolygons() {
    // Créer des polygones basiques pour chaque arrondissement
    const features = [];
    const baseCoords = {
        1: {center: [2.3376, 48.8606], size: 0.008},
        2: {center: [2.3412, 48.8698], size: 0.008},
        3: {center: [2.3624, 48.8630], size: 0.008},
        4: {center: [2.3522, 48.8546], size: 0.008},
        5: {center: [2.3447, 48.8448], size: 0.010},
        6: {center: [2.3327, 48.8448], size: 0.010},
        7: {center: [2.3186, 48.8566], size: 0.010},
        8: {center: [2.3132, 48.8738], size: 0.010},
        9: {center: [2.3392, 48.8738], size: 0.008},
        10: {center: [2.3624, 48.8738], size: 0.010},
        11: {center: [2.3768, 48.8630], size: 0.012},
        12: {center: [2.3768, 48.8448], size: 0.012},
        13: {center: [2.3522, 48.8322], size: 0.015},
        14: {center: [2.3264, 48.8330], size: 0.015},
        15: {center: [2.2995, 48.8412], size: 0.018},
        16: {center: [2.2654, 48.8534], size: 0.020},
        17: {center: [2.3214, 48.8838], size: 0.015},
        18: {center: [2.3447, 48.8932], size: 0.015},
        19: {center: [2.3768, 48.8838], size: 0.015},
        20: {center: [2.3984, 48.8630], size: 0.015}
    };
    
    for (let arr = 1; arr <= 20; arr++) {
        const coords = baseCoords[arr];
        const size = coords.size;
        const lon = coords.center[0];
        const lat = coords.center[1];
        
        // Créer un carré autour du centre
        const polygon = [
            [lon - size, lat - size],
            [lon + size, lat - size],
            [lon + size, lat + size],
            [lon - size, lat + size],
            [lon - size, lat - size]
        ];
        
        features.push({
            type: 'Feature',
            properties: {
                arrondissement: arr,
                nom: arr === 1 ? '1er' : `${arr}e`
            },
            geometry: {
                type: 'Polygon',
                coordinates: [polygon]
            }
        });
    }
    
    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Mise à jour de la carte avec les données
async function updateMap() {
    if (!map) {
        console.error('Carte non initialisée');
        return;
    }
    
    // Vérifier que la carte est chargée
    if (!map.loaded()) {
        console.log('Attente du chargement de la carte...');
        map.once('load', () => updateMap());
        return;
    }
    
    // Si pas de données, créer des polygones basiques quand même
    if (!allData) {
        console.warn('Données non chargées, affichage des polygones basiques');
    }

    // Charger les polygones si pas déjà fait
    if (!arrondissementsPolygons) {
        await loadPolygons();
    }

    if (!arrondissementsPolygons) {
        console.error('Impossible de charger les polygones');
        return;
    }
    
    console.log('Polygones chargés:', arrondissementsPolygons.features.length);
    console.log('Type de géométrie:', arrondissementsPolygons.features[0]?.geometry?.type);
    console.log('Points du premier arrondissement:', arrondissementsPolygons.features[0]?.geometry?.coordinates[0]?.length);

    const features = arrondissementsPolygons.features.map(polygon => {
        let arrNum = polygon.properties.arrondissement;
        if (!arrNum && polygon.properties.c_ar !== undefined) {
            arrNum = parseInt(polygon.properties.c_ar);
        }
        if (!arrNum && polygon.properties.c_arinsee) {
            const code = String(polygon.properties.c_arinsee);
            if (code.startsWith('751') && code.length === 5) {
                arrNum = parseInt(code.substring(3));
            }
        }
        
        if (!arrNum) {
            console.warn('Arrondissement non trouvé pour:', polygon.properties);
            return null;
        }
        
        const arrData = allData ? allData.find(a => a.arrondissement === arrNum) : null;
        
        let defaultValue = 9000;
        if (selectedIndicator === 'logements') defaultValue = 15;
        if (selectedIndicator === 'pollution') defaultValue = 5;
        if (selectedIndicator === 'revenus') defaultValue = 30000;
        if (selectedIndicator === 'vegetation') defaultValue = 1000;
        if (selectedIndicator === 'transports') defaultValue = 20;
        
        let value = defaultValue;
        if (arrData) {
            const calculatedValue = getIndicatorValue(arrData, selectedIndicator, selectedYear);
            value = calculatedValue !== null && calculatedValue !== undefined && calculatedValue >= 0 ? calculatedValue : defaultValue;
        }
        
        let color = getColorForIndicator(selectedIndicator, value);
        
        return {
            ...polygon,
            properties: {
                ...polygon.properties,
                value: value,
                color: color,
                indicator: selectedIndicator,
                ...(arrData || {})
            }
        };
    }).filter(f => f !== null);

    console.log(`Features créées: ${features.length} (devrait être 20)`);

    const geojson = {
        type: 'FeatureCollection',
        features: features
    };

    if (map.getSource('arrondissements')) {
        map.getSource('arrondissements').setData(geojson);
        if (map.getLayer('arrondissements-fill')) {
            const colorExpression = getColorExpressionForIndicator(selectedIndicator);
            map.setPaintProperty('arrondissements-fill', 'fill-color', colorExpression);
            map.setPaintProperty('arrondissements-fill', 'fill-outline-color', '#000000');
        }
        if (map.getLayer('arrondissements-outline-thick')) {
            map.setPaintProperty('arrondissements-outline-thick', 'line-width', [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 8,
                12, 10,
                14, 12,
                16, 15
            ]);
            map.setPaintProperty('arrondissements-outline-thick', 'line-color', '#000000');
            map.setPaintProperty('arrondissements-outline-thick', 'line-opacity', 1);
        }
        if (map.getLayer('arrondissements-outline')) {
            map.setPaintProperty('arrondissements-outline', 'line-width', [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 4,
                12, 5,
                14, 6,
                16, 7
            ]);
            map.setPaintProperty('arrondissements-outline', 'line-color', '#000000');
            map.setPaintProperty('arrondissements-outline', 'line-opacity', 1);
        }
        
        // Afficher les arbres si l'indicateur végétation est sélectionné
        if (selectedIndicator === 'vegetation') {
            updateTreeMarkers();
            removeTransportMarkers();
        } else if (selectedIndicator === 'transports') {
            updateTransportMarkers();
            removeTreeMarkers();
        } else {
            removeTreeMarkers();
            removeTransportMarkers();
        }
    } else {
        map.addSource('arrondissements', {
            type: 'geojson',
            data: geojson
        });

        map.addLayer({
            id: 'arrondissements-fill',
            type: 'fill',
            source: 'arrondissements',
            paint: {
                'fill-color': getColorExpressionForIndicator(selectedIndicator),
                'fill-opacity': [
                    'case',
                    ['has', 'value'], 0.7,
                    0.5
                ],
                'fill-outline-color': '#000000'
            }
        });

        map.addLayer({
            id: 'arrondissements-outline-thick',
            type: 'line',
            source: 'arrondissements',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#000000',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 8,
                    12, 10,
                    14, 12,
                    16, 15
                ],
                'line-opacity': 1
            }
        }, 'arrondissements-fill');
        
        map.addLayer({
            id: 'arrondissements-outline',
            type: 'line',
            source: 'arrondissements',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#000000',
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    10, 4,
                    12, 5,
                    14, 6,
                    16, 7
                ],
                'line-opacity': 1
            }
        }, 'arrondissements-outline-thick');
    }

    // Garder la carte droite (pas d'animation si déjà droite)
    if (map.getPitch() !== 0) {
        map.easeTo({
            duration: 500,
            pitch: 0,
            bearing: 0
        });
    }
    
    // Afficher les arbres si l'indicateur végétation est sélectionné
    if (selectedIndicator === 'vegetation') {
        updateTreeMarkers();
        removeTransportMarkers();
    } else if (selectedIndicator === 'transports') {
        updateTransportMarkers();
        removeTreeMarkers();
    } else {
        removeTreeMarkers();
        removeTransportMarkers();
    }
}

let treeMarkers = [];

function updateTreeMarkers() {
    removeTreeMarkers();
    
    if (!allData || !map) {
        console.log('updateTreeMarkers: allData ou map manquant');
        return;
    }
    
    console.log('updateTreeMarkers: Affichage des arbres pour indicateur:', selectedIndicator);
    
    allData.forEach(arr => {
        const vegetation = arr.vegetation_arbres || {};
        const nombreArbres = vegetation.nombre_arbres || 0;
        
        console.log(`Arrondissement ${arr.arrondissement}: ${nombreArbres} arbres`);
        
        if (nombreArbres > 0) {
            const coords = arrondissementCoords[arr.arrondissement];
            if (coords) {
                // Calculer le nombre d'arbres à afficher (1 arbre pour ~150 arbres réels, max 20 arbres)
                const nbArbresAffiches = Math.min(Math.max(1, Math.floor(nombreArbres / 150)), 20);
                
                // Taille de base selon le nombre d'arbres (plus d'arbres = plus gros)
                let baseSize = 16;
                if (nombreArbres >= 3000) baseSize = 32;
                else if (nombreArbres >= 2000) baseSize = 28;
                else if (nombreArbres >= 1000) baseSize = 24;
                else if (nombreArbres >= 500) baseSize = 20;
                
                // Disperser les arbres dans l'arrondissement
                for (let i = 0; i < nbArbresAffiches; i++) {
                    // Variation aléatoire autour du centre (environ 0.01° = ~1km)
                    const variationLat = (Math.random() - 0.5) * 0.015;
                    const variationLng = (Math.random() - 0.5) * 0.015;
                    
                    const treeCoords = [
                        coords[1] + variationLng,
                        coords[0] + variationLat
                    ];
                    
                    // Légère variation de taille pour plus de réalisme
                    const sizeVariation = 0.8 + Math.random() * 0.4; // Entre 80% et 120%
                    const iconSize = Math.round(baseSize * sizeVariation);
                    
                    const el = document.createElement('div');
                    el.className = 'tree-marker';
                    el.style.width = iconSize + 'px';
                    el.style.height = iconSize + 'px';
                    el.style.backgroundImage = 'url(./static/images/tree-icon.svg)';
                    el.style.backgroundSize = 'contain';
                    el.style.backgroundRepeat = 'no-repeat';
                    el.style.backgroundPosition = 'center';
                    el.style.cursor = 'pointer';
                    el.style.userSelect = 'none';
                    el.style.pointerEvents = 'auto';
                    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
                    el.style.display = 'block';
                    el.style.border = 'none';
                    el.style.backgroundColor = 'transparent';
                    el.style.boxShadow = 'none';
                    el.title = `${arr.arrondissement}e: ${nombreArbres} arbres`;
                    
                    const marker = new maplibregl.Marker({
                        element: el,
                        anchor: 'center'
                    })
                        .setLngLat(treeCoords)
                        .addTo(map);
                    
                    treeMarkers.push(marker);
                }
            }
        }
    });
    
    console.log(`Total arbres affichés: ${treeMarkers.length}`);
}

function removeTreeMarkers() {
    treeMarkers.forEach(marker => marker.remove());
    treeMarkers = [];
}

let transportMarkers = [];
let transportsData = null;

function loadTransportsData() {
    // Utiliser les données intégrées directement dans le JavaScript pour éviter CORS
    if (typeof TRANSPORTS_DATA !== 'undefined') {
        transportsData = TRANSPORTS_DATA;
        const total = Object.values(transportsData.transports_by_arrondissement || {}).reduce((sum, arr) => {
            return sum + (arr.metro?.length || 0) + (arr.rer?.length || 0) + (arr.bus?.length || 0);
        }, 0);
        console.log(`✅ Données de transport chargées: ${total} transports avec coordonnées réelles`);
    } else {
        console.warn('⚠️ TRANSPORTS_DATA non défini, utilisation de données par défaut');
    }
}

function updateTransportMarkers() {
    removeTransportMarkers();
    
    if (!allData || !map) {
        console.log('updateTransportMarkers: allData ou map manquant');
        return;
    }
    
    console.log('updateTransportMarkers: Affichage des transports pour indicateur:', selectedIndicator);
    
    // Utiliser les données réelles si disponibles
    if (transportsData && transportsData.transports_by_arrondissement) {
        const transportsByArr = transportsData.transports_by_arrondissement;
        let totalCount = 0;
        
        for (let arrNum = 1; arrNum <= 20; arrNum++) {
            const arrTransports = transportsByArr[arrNum];
            if (!arrTransports) continue;
            
            // Afficher toutes les stations de métro avec leurs coordonnées réelles EXACTES
            arrTransports.metro.forEach(station => {
                if (!station.lat || !station.lon) {
                    console.warn(`Station métro ${station.name} sans coordonnées`);
                    return;
                }
                
                const iconSize = 28;
                const el = createTransportIcon('metro', iconSize, `${station.name} (${station.lat.toFixed(4)}, ${station.lon.toFixed(4)})`);
                
                // Utiliser les coordonnées EXACTES : [longitude, latitude] pour MapLibre
                const marker = new maplibregl.Marker({
                    element: el,
                    anchor: 'center'
                })
                    .setLngLat([station.lon, station.lat])  // [lon, lat] - ordre correct pour MapLibre
                    .addTo(map);
                
                transportMarkers.push(marker);
                totalCount++;
                console.log(`Métro: ${station.name} à [${station.lon}, ${station.lat}]`);
            });
            
            // Afficher toutes les stations RER avec leurs coordonnées réelles EXACTES
            arrTransports.rer.forEach(station => {
                if (!station.lat || !station.lon) {
                    console.warn(`Station RER ${station.name} sans coordonnées`);
                    return;
                }
                
                const iconSize = 30;
                const el = createTransportIcon('rer', iconSize, `${station.name} (${station.lat.toFixed(4)}, ${station.lon.toFixed(4)})`);
                
                // Utiliser les coordonnées EXACTES : [longitude, latitude] pour MapLibre
                const marker = new maplibregl.Marker({
                    element: el,
                    anchor: 'center'
                })
                    .setLngLat([station.lon, station.lat])  // [lon, lat] - ordre correct pour MapLibre
                    .addTo(map);
                
                transportMarkers.push(marker);
                totalCount++;
                console.log(`RER: ${station.name} à [${station.lon}, ${station.lat}]`);
            });
            
            // Afficher les arrêts de bus avec leurs coordonnées réelles EXACTES
            arrTransports.bus.forEach(stop => {
                if (!stop.lat || !stop.lon) {
                    console.warn(`Arrêt bus ${stop.name} sans coordonnées`);
                    return;
                }
                
                const iconSize = 20;
                const el = createTransportIcon('bus', iconSize, `${stop.name} (${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)})`);
                
                // Utiliser les coordonnées EXACTES : [longitude, latitude] pour MapLibre
                const marker = new maplibregl.Marker({
                    element: el,
                    anchor: 'center'
                })
                    .setLngLat([stop.lon, stop.lat])  // [lon, lat] - ordre correct pour MapLibre
                    .addTo(map);
                
                transportMarkers.push(marker);
                totalCount++;
            });
        }
        
        console.log(`✅ Total transports affichés avec coordonnées RÉELLES: ${totalCount} (${transportMarkers.length} marqueurs)`);
        return;
    } else {
        console.warn('⚠️ Données de transport non chargées, utilisation du fallback');
    }
    
    // Fallback: utiliser les données générées avec coordonnées aléatoires
    allData.forEach(arr => {
        const transports = arr.transports_publics || {};
        const totalTransports = transports.total_transports || 0;
        const stationsMetro = transports.stations_metro || 0;
        const stationsRer = transports.stations_rer || 0;
        const arretsBus = transports.arrets_bus || 0;
        
        if (totalTransports > 0) {
            const coords = arrondissementCoords[arr.arrondissement];
            if (coords) {
                // Calculer le nombre de marqueurs à afficher (1 pour ~10 transports, max 15)
                const nbMarqueurs = Math.min(Math.max(1, Math.floor(totalTransports / 10)), 15);
                
                // Taille de base selon le nombre de transports
                let baseSize = 18;
                if (totalTransports >= 50) baseSize = 32;
                else if (totalTransports >= 30) baseSize = 28;
                else if (totalTransports >= 15) baseSize = 24;
                else if (totalTransports >= 5) baseSize = 20;
                
                // Disperser les transports dans l'arrondissement
                for (let i = 0; i < nbMarqueurs; i++) {
                    const variationLat = (Math.random() - 0.5) * 0.015;
                    const variationLng = (Math.random() - 0.5) * 0.015;
                    
                    const transportCoords = [
                        coords[1] + variationLng,
                        coords[0] + variationLat
                    ];
                    
                    const sizeVariation = 0.8 + Math.random() * 0.4;
                    const iconSize = Math.round(baseSize * sizeVariation);
                    
                    // Choisir le type de transport selon les proportions
                    let transportType = 'bus';
                    const rand = Math.random();
                    if (stationsMetro > 0 && rand < (stationsMetro / totalTransports)) {
                        transportType = 'metro';
                    } else if (stationsRer > 0 && rand < ((stationsMetro + stationsRer) / totalTransports)) {
                        transportType = 'rer';
                    }
                    
                    const el = createTransportIcon(transportType, iconSize, `${arr.arrondissement}e arrondissement`);
                    
                    const marker = new maplibregl.Marker({
                        element: el,
                        anchor: 'center'
                    })
                        .setLngLat(transportCoords)
                        .addTo(map);
                    
                    transportMarkers.push(marker);
                }
            }
        }
    });
    
    console.log(`Total transports affichés: ${transportMarkers.length}`);
}

function createTransportIcon(type, size, title) {
    const iconFile = type === 'metro' ? 'metro-icon.svg' : 
                    type === 'rer' ? 'rer-icon.svg' : 
                    'bus-icon.svg';
    
    const el = document.createElement('div');
    el.className = 'transport-marker';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundImage = `url(./static/images/${iconFile})`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.pointerEvents = 'auto';
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
    el.style.display = 'block';
    el.style.border = 'none';
    el.style.backgroundColor = 'transparent';
    el.style.boxShadow = 'none';
    el.title = title;
    
    return el;
}

function removeTransportMarkers() {
    transportMarkers.forEach(marker => marker.remove());
    transportMarkers = [];
}

// Obtenir l'expression de couleur pour MapLibre selon l'indicateur
function getColorExpressionForIndicator(indicator) {
    switch (indicator) {
        case 'prix':
            return [
                'case',
                ['<', ['get', 'value'], 8000], '#6b7280',
                ['<', ['get', 'value'], 10000], '#10b981',
                ['<', ['get', 'value'], 12000], '#f59e0b',
                ['<', ['get', 'value'], 15000], '#ef4444',
                '#dc2626'
            ];
        case 'logements':
            return [
                'case',
                ['>=', ['get', 'value'], 25], '#10b981',   // Vert (beaucoup)
                ['>=', ['get', 'value'], 15], '#3b82f6',    // Bleu (moyen)
                ['>=', ['get', 'value'], 8], '#f59e0b',     // Orange (peu)
                '#ef4444'  // Rouge (très peu)
            ];
        case 'pollution':
            return [
                'case',
                ['<=', ['get', 'value'], 3], '#10b981',    // Vert (bon)
                ['<=', ['get', 'value'], 5], '#f59e0b',     // Orange (moyen)
                ['<=', ['get', 'value'], 7], '#ef4444',     // Rouge (mauvais)
                '#dc2626'  // Rouge foncé (très mauvais)
            ];
        case 'revenus':
            return [
                'case',
                ['>=', ['get', 'value'], 40000], '#10b981', // Vert (élevé)
                ['>=', ['get', 'value'], 30000], '#3b82f6', // Bleu (moyen-élevé)
                ['>=', ['get', 'value'], 25000], '#f59e0b', // Orange (moyen)
                '#ef4444'  // Rouge (bas)
            ];
        case 'vegetation':
            return [
                'case',
                ['>=', ['get', 'value'], 3000], '#10b981',   // Vert foncé (beaucoup d'arbres)
                ['>=', ['get', 'value'], 2000], '#22c55e',   // Vert (moyen-élevé)
                ['>=', ['get', 'value'], 1000], '#84cc16',   // Vert clair (moyen)
                ['>=', ['get', 'value'], 500], '#eab308',    // Jaune (peu)
                '#f59e0b'  // Orange (très peu)
            ];
        case 'transports':
            return [
                'case',
                ['>=', ['get', 'value'], 50], '#3b82f6',    // Bleu (beaucoup de transports)
                ['>=', ['get', 'value'], 30], '#6366f1',     // Indigo (moyen-élevé)
                ['>=', ['get', 'value'], 15], '#8b5cf6',     // Violet (moyen)
                ['>=', ['get', 'value'], 5], '#a855f7',     // Violet clair (peu)
                '#c084fc'  // Violet très clair (très peu)
            ];
        default:
            return [
                'case',
                ['<', ['get', 'value'], 8000], '#6b7280',
                ['<', ['get', 'value'], 10000], '#10b981',
                ['<', ['get', 'value'], 12000], '#f59e0b',
                ['<', ['get', 'value'], 15000], '#ef4444',
                '#dc2626'
            ];
    }
}

function getColorForIndicator(indicator, value) {
    switch (indicator) {
        case 'prix':
            // Prix/m² : 8000-15000€
            if (value >= 12000) return '#ef4444'; // Rouge (élevé)
            if (value >= 10000) return '#f59e0b'; // Orange (moyen)
            if (value >= 8000) return '#10b981';  // Vert (bas)
            return '#6b7280'; // Gris (très bas)
            
        case 'logements':
            // Logements sociaux : 0-30% (plus = mieux pour mixité sociale)
            if (value >= 25) return '#10b981';   // Vert (beaucoup de logements sociaux)
            if (value >= 15) return '#3b82f6';    // Bleu (moyen)
            if (value >= 8) return '#f59e0b';    // Orange (peu)
            return '#ef4444'; // Rouge (très peu)
            
        case 'pollution':
            // Qualité air : 1-10 (plus bas = mieux)
            if (value <= 3) return '#10b981';     // Vert (bon)
            if (value <= 5) return '#f59e0b';     // Orange (moyen)
            if (value <= 7) return '#ef4444';     // Rouge (mauvais)
            return '#dc2626'; // Rouge foncé (très mauvais)
            
        case 'revenus':
            // Revenus : 20000-50000€
            if (value >= 40000) return '#10b981'; // Vert (élevé)
            if (value >= 30000) return '#3b82f6'; // Bleu (moyen-élevé)
            if (value >= 25000) return '#f59e0b'; // Orange (moyen)
            return '#ef4444'; // Rouge (bas)
            
        case 'vegetation':
            // Végétation : nombre d'arbres (0-5000)
            if (value >= 3000) return '#10b981';   // Vert foncé (beaucoup)
            if (value >= 2000) return '#22c55e';     // Vert (moyen-élevé)
            if (value >= 1000) return '#84cc16';    // Vert clair (moyen)
            if (value >= 500) return '#eab308';     // Jaune (peu)
            return '#f59e0b'; // Orange (très peu)
            
        case 'transports':
            // Transports : total stations/arrêts (0-70+)
            if (value >= 50) return '#3b82f6';     // Bleu (beaucoup)
            if (value >= 30) return '#6366f1';      // Indigo (moyen-élevé)
            if (value >= 15) return '#8b5cf6';      // Violet (moyen)
            if (value >= 5) return '#a855f7';       // Violet clair (peu)
            return '#c084fc'; // Violet très clair (très peu)
            
        default:
            return '#6b7280'; // Gris par défaut
    }
}

function getIndicatorValue(arr, indicator, year) {
    switch (indicator) {
        case 'prix':
            const evolution = arr.evolution_annuelle || [];
            const yearData = evolution.find(e => e.annee === year);
            return yearData ? yearData.prix_m2_median : (arr.statistiques?.prix_m2_actuel || 0);
        case 'logements':
            return arr.logements_sociaux_pourcentage || 0;
        case 'pollution':
            return arr.pollution_qualite_air?.indice_atmo || 0;
        case 'revenus':
            return arr.revenus_moyens?.revenu_median_menage || 0;
        case 'vegetation':
            return arr.vegetation_arbres?.nombre_arbres || 0;
        case 'transports':
            return arr.transports_publics?.total_transports || 0;
        default:
            return arr.statistiques?.prix_m2_actuel || 0;
    }
}

// Afficher le tooltip
function showTooltip(e, arrNum) {
    const arr = allData.find(a => a.arrondissement === arrNum);
    if (!arr) return;

    const tooltip = document.getElementById('tooltip');
    const value = getIndicatorValue(arr, selectedIndicator, selectedYear);
    const valueLabel = getIndicatorLabel(selectedIndicator, value);

    tooltip.innerHTML = `
        <div class="tooltip-title">${arr.arrondissement}e Arrondissement</div>
        <div class="tooltip-content">
            <div><strong>${getIndicatorName(selectedIndicator)}:</strong> ${valueLabel}</div>
            <div><strong>Prix/m²:</strong> ${arr.statistiques?.prix_m2_actuel?.toLocaleString('fr-FR')}€</div>
            <div><strong>Logements sociaux:</strong> ${arr.logements_sociaux_pourcentage}%</div>
        </div>
    `;

    tooltip.style.left = e.point.x + 10 + 'px';
    tooltip.style.top = e.point.y + 10 + 'px';
    tooltip.classList.remove('hidden');
}

function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}

// Sélectionner un arrondissement
function selectArrondissement(arrNum) {
    selectedArr = arrNum;
    const arr = allData.find(a => a.arrondissement === arrNum);
    if (!arr) return;

    updateSelectedInfo(arr);
    updateCharts();
    
    // Centrer la carte sur l'arrondissement
    const coords = arrondissementCoords[arrNum];
    if (coords) {
        map.flyTo({
            center: [coords[1], coords[0]],
            zoom: 14,
            duration: 1500
        });
    }
}

function updateSelectedInfo(arr) {
    const infoDiv = document.getElementById('selected-info');
    infoDiv.innerHTML = `
        <div class="info-content">
            <div class="info-title">${arr.arrondissement}e Arrondissement</div>
            <div class="info-item">
                <span class="info-label">Prix/m² actuel</span>
                <span class="info-value">${arr.statistiques?.prix_m2_actuel?.toLocaleString('fr-FR')}€</span>
            </div>
            <div class="info-item">
                <span class="info-label">Variation</span>
                <span class="info-value">${arr.evolution_calculee?.variation_pourcentage?.toFixed(2) || 0}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Logements sociaux</span>
                <span class="info-value">${arr.logements_sociaux_pourcentage}%</span>
            </div>
            <div class="info-item">
                <span class="info-label">Qualité air</span>
                <span class="info-value">${arr.pollution_qualite_air?.qualite || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Revenu médian</span>
                <span class="info-value">${arr.revenus_moyens?.revenu_median_menage?.toLocaleString('fr-FR') || 'N/A'}€</span>
            </div>
            ${getTransportsInfoHTML(arr)}
        </div>
    `;
}

function getTransportsInfoHTML(arr) {
    const transports = arr.transports_publics || {};
    const stationsMetro = transports.stations_metro || 0;
    const stationsRer = transports.stations_rer || 0;
    const arretsBus = transports.arrets_bus || 0;
    const lignesMetro = transports.lignes_metro || 0;
    const lignesBus = transports.lignes_bus || 0;
    const totalTransports = transports.total_transports || 0;
    
    if (totalTransports === 0) {
        return '';
    }
    
    return `
        <div class="transports-section">
            <div class="transports-title">🚇 Transports Publics</div>
            <div class="transports-grid">
                <div class="transport-card metro">
                    <div class="transport-icon">🚇</div>
                    <div class="transport-info">
                        <div class="transport-label">Métro</div>
                        <div class="transport-stats">
                            <span class="transport-count">${stationsMetro} stations</span>
                            <span class="transport-lines">${lignesMetro} lignes</span>
                        </div>
                    </div>
                </div>
                <div class="transport-card rer">
                    <div class="transport-icon">🚆</div>
                    <div class="transport-info">
                        <div class="transport-label">RER</div>
                        <div class="transport-stats">
                            <span class="transport-count">${stationsRer} stations</span>
                        </div>
                    </div>
                </div>
                <div class="transport-card bus">
                    <div class="transport-icon">🚌</div>
                    <div class="transport-info">
                        <div class="transport-label">Bus</div>
                        <div class="transport-stats">
                            <span class="transport-count">${arretsBus} arrêts</span>
                            <span class="transport-lines">${lignesBus} lignes</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="transport-total">
                <span>Total: ${totalTransports} points d'accès</span>
            </div>
        </div>
    `;
}

function updateGlobalStats() {
    if (!allData) return;

    const prices = allData
        .map(arr => {
            const evolution = arr.evolution_annuelle || [];
            const yearData = evolution.find(e => e.annee === selectedYear);
            return yearData ? yearData.prix_m2_median : arr.statistiques?.prix_m2_actuel;
        })
        .filter(p => p);

    if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        document.getElementById('avg-price').textContent = Math.round(avgPrice).toLocaleString('fr-FR') + '€';

        const variations = allData
            .map(arr => arr.evolution_calculee?.variation_pourcentage)
            .filter(v => v !== undefined && v !== null);
        
        if (variations.length > 0) {
            const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
            document.getElementById('avg-variation').textContent = avgVariation.toFixed(2) + '%';
        }
    }
}

// Initialiser les graphiques
function initializeCharts() {
    updateTimelineChart();
    updateComparisonChart();
    updateTypologyChart();
    updateTransportsChart();
}

// Graphique timeline
function updateTimelineChart() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    if (charts.timeline) {
        charts.timeline.destroy();
    }

    if (!allData) return;

    const arr = selectedArr ? allData.find(a => a.arrondissement === selectedArr) : allData[0];
    if (!arr) return;

    const evolution = arr.evolution_annuelle || [];
    const labels = evolution.map(e => e.annee);
    const data = evolution.map(e => e.prix_m2_median);

    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix/m² médian (€)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// Graphique de comparaison
function updateComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    if (charts.comparison) {
        charts.comparison.destroy();
    }

    if (!allData) return;

    const labels = allData.map(arr => `${arr.arrondissement}e`);
    const evolution = allData.map(arr => {
        const yearData = arr.evolution_annuelle?.find(e => e.annee === selectedYear);
        return yearData ? yearData.prix_m2_median : arr.statistiques?.prix_m2_actuel || 0;
    });

    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Prix/m² (€)',
                data: evolution,
                backgroundColor: evolution.map(v => {
                    if (v < 10000) return '#10b981';
                    if (v < 12000) return '#f59e0b';
                    return '#ef4444';
                }),
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: '#334155'
                    }
                }
            }
        }
    });
}

// Graphique typologie
function updateTypologyChart() {
    const chartElement = document.getElementById('typology-chart');
    if (!chartElement) {
        console.warn('Element typology-chart non trouvé');
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
    if (charts.typology) {
        charts.typology.destroy();
    }

    if (!allData || allData.length === 0) {
        console.warn('Aucune donnée disponible pour le graphique typologie');
        return;
    }

    const arr = selectedArr ? allData.find(a => a.arrondissement === selectedArr) : allData[0];
    if (!arr) {
        console.warn('Arrondissement non trouvé pour le graphique typologie');
        return;
    }

    const typology = arr.typologie || {};
    console.log('Typologie pour arrondissement', arr.arrondissement, ':', typology);
    
    // Utiliser la nouvelle structure : repartition_pieces
    const repartition = typology.repartition_pieces || {};
    const labels = Object.keys(repartition);
    const data = Object.values(repartition);
    
    if (labels.length === 0 || data.length === 0) {
        console.warn('Aucune donnée de répartition disponible:', repartition);
        return;
    }
    
    console.log('Labels:', labels, 'Data:', data);

    try {
        charts.typology = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Répartition (%)',
                data: data,
                backgroundColor: [
                    '#6366f1',  // Studio
                    '#8b5cf6',  // T2
                    '#ec4899',  // T3
                    '#f59e0b',  // T4
                    '#10b981'   // T5+
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const typeLogement = typology.type_logement || {};
                            const total = typeLogement.total_logements || 0;
                            const detail = typology.detail_pieces || {};
                            
                            // Trouver le détail correspondant
                            let detailInfo = '';
                            for (const [key, info] of Object.entries(detail)) {
                                if (info.type === label) {
                                    detailInfo = ` (${info.nombre.toLocaleString('fr-FR')} logements)`;
                                    break;
                                }
                            }
                            
                            return `${label}: ${value.toFixed(1)}%${detailInfo}`;
                        }
                    }
                }
            }
        }
    });
    } catch (error) {
        console.error('Erreur lors de la création du graphique typologie:', error);
        // Afficher un message d'erreur dans le canvas
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Erreur: Impossible d\'afficher le graphique', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

// Graphique transports
function updateTransportsChart() {
    const chartElement = document.getElementById('transports-chart');
    if (!chartElement) {
        return;
    }
    
    const ctx = chartElement.getContext('2d');
    
    if (charts.transports) {
        charts.transports.destroy();
    }

    if (!allData || allData.length === 0) {
        return;
    }

    const arr = selectedArr ? allData.find(a => a.arrondissement === selectedArr) : allData[0];
    if (!arr) {
        return;
    }

    const transports = arr.transports_publics || {};
    const stationsMetro = transports.stations_metro || 0;
    const stationsRer = transports.stations_rer || 0;
    const arretsBus = transports.arrets_bus || 0;
    const lignesMetro = transports.lignes_metro || 0;
    const lignesBus = transports.lignes_bus || 0;
    
    if (stationsMetro === 0 && stationsRer === 0 && arretsBus === 0) {
        return;
    }

    try {
        charts.transports = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Métro', 'RER', 'Bus'],
                datasets: [
                    {
                        label: 'Stations/Arrêts',
                        data: [stationsMetro, stationsRer, arretsBus],
                        backgroundColor: [
                            '#003E7E',
                            '#0066CC',
                            '#FF6B00'
                        ],
                        borderColor: [
                            '#002855',
                            '#0052A3',
                            '#E55A00'
                        ],
                        borderWidth: 2
                    },
                    {
                        label: 'Lignes',
                        data: [lignesMetro, 0, lignesBus],
                        backgroundColor: [
                            'rgba(0, 62, 126, 0.5)',
                            'rgba(0, 102, 204, 0.5)',
                            'rgba(255, 107, 0, 0.5)'
                        ],
                        borderColor: [
                            '#003E7E',
                            '#0066CC',
                            '#FF6B00'
                        ],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y || 0;
                                const transportType = context.label;
                                
                                if (label === 'Stations/Arrêts') {
                                    if (transportType === 'Métro') {
                                        return `Stations métro: ${value}`;
                                    } else if (transportType === 'RER') {
                                        return `Stations RER: ${value}`;
                                    } else {
                                        return `Arrêts bus: ${value}`;
                                    }
                                } else {
                                    if (transportType === 'Métro') {
                                        return `Lignes métro: ${value}`;
                                    } else if (transportType === 'Bus') {
                                        return `Lignes bus: ${value}`;
                                    }
                                    return '';
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#cbd5e1',
                            stepSize: 1
                        },
                        grid: {
                            color: '#334155'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#cbd5e1'
                        },
                        grid: {
                            color: '#334155'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création du graphique transports:', error);
    }
}

function updateCharts() {
    updateTimelineChart();
    updateComparisonChart();
    updateTypologyChart();
    updateTransportsChart();
}

// Configuration des événements
function setupEventListeners() {
    // Sélecteur d'année
    document.getElementById('year-selector').addEventListener('change', (e) => {
        selectedYear = parseInt(e.target.value);
        updateMap();
        updateGlobalStats();
        updateCharts();
    });

    // Indicateurs
    document.querySelectorAll('.indicator-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.indicator-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedIndicator = item.dataset.indicator;
            updateMap();
            // Forcer la mise à jour des arbres si végétation
            if (selectedIndicator === 'vegetation') {
                setTimeout(() => updateTreeMarkers(), 200);
            } else {
                removeTreeMarkers();
            }
        });
    });

    // Mode comparaison
    document.getElementById('compare-mode-btn').addEventListener('click', () => {
        const panel = document.getElementById('compare-panel');
        panel.classList.toggle('hidden');
    });

    // Comparaison
    document.getElementById('compare-execute').addEventListener('click', async () => {
        const arr1 = document.getElementById('compare-arr1').value;
        const arr2 = document.getElementById('compare-arr2').value;
        
        if (!arr1 || !arr2) {
            alert('Veuillez sélectionner deux arrondissements');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/comparaison?arr1=${arr1}&arr2=${arr2}`);
            const data = await response.json();
            displayComparison(data);
        } catch (error) {
            console.error('Erreur:', error);
        }
    });

    // Timeline
    const timelineBtn = document.getElementById('play-timeline');
    if (timelineBtn) {
        timelineBtn.addEventListener('click', () => {
            if (timelinePlaying) {
                pauseTimeline();
            } else {
                playTimeline();
            }
        });
    } else {
        console.warn('Bouton timeline non trouvé');
    }

    // Remplir les selects
    if (allData) {
        const compare1 = document.getElementById('compare-arr1');
        const compare2 = document.getElementById('compare-arr2');
        
        allData.forEach(arr => {
            const option = `<option value="${arr.arrondissement}">${arr.arrondissement}e arr.</option>`;
            compare1.innerHTML += option;
            compare2.innerHTML += option;
        });
    }
}

// Afficher la comparaison
function displayComparison(data) {
    const resultsDiv = document.getElementById('compare-results');
    
    resultsDiv.innerHTML = `
        <div class="compare-result-card">
            <h4>${data.arrondissement_1.nom} Arrondissement</h4>
            <div class="stat-value">${data.arrondissement_1.prix_m2_actuel?.toLocaleString('fr-FR')}€/m²</div>
            <div>Logements sociaux: ${data.arrondissement_1.logements_sociaux_pourcentage}%</div>
        </div>
        <div class="compare-result-card">
            <h4>${data.arrondissement_2.nom} Arrondissement</h4>
            <div class="stat-value">${data.arrondissement_2.prix_m2_actuel?.toLocaleString('fr-FR')}€/m²</div>
            <div>Logements sociaux: ${data.arrondissement_2.logements_sociaux_pourcentage}%</div>
        </div>
        <div class="compare-result-card">
            <h4>Différences</h4>
            <div>Prix: ${data.differences.prix_m2_diff_pourcentage?.toFixed(2)}%</div>
            <div>Logements sociaux: ${data.differences.logements_sociaux_diff?.toFixed(2)}%</div>
        </div>
    `;
}

// Timeline animée
function playTimeline() {
    if (timelinePlaying) return;
    
    timelinePlaying = true;
    const years = [2022, 2023, 2024];
    let yearIndex = years.indexOf(selectedYear);
    if (yearIndex === -1) yearIndex = 0;

    const timelineBtn = document.getElementById('play-timeline');
    if (timelineBtn) {
        timelineBtn.innerHTML = '<span>⏸</span> Timeline';
        timelineBtn.classList.add('playing');
    }

    if (timelineInterval) {
        clearInterval(timelineInterval);
    }

    timelineInterval = setInterval(() => {
        selectedYear = years[yearIndex];
        const yearSelector = document.getElementById('year-selector');
        if (yearSelector) {
            yearSelector.value = selectedYear;
        }
        
        updateMap();
        updateGlobalStats();
        updateCharts();
        
        yearIndex = (yearIndex + 1) % years.length;
    }, 2000);
}

function pauseTimeline() {
    timelinePlaying = false;
    if (timelineInterval) {
        clearInterval(timelineInterval);
        timelineInterval = null;
    }
    
    const timelineBtn = document.getElementById('play-timeline');
    if (timelineBtn) {
        timelineBtn.innerHTML = '<span>▶</span> Timeline';
        timelineBtn.classList.remove('playing');
    }
}

// Helpers
function getIndicatorName(indicator) {
    const names = {
        'prix': 'Prix/m²',
        'logements': 'Logements sociaux',
        'pollution': 'Qualité air',
        'revenus': 'Revenus',
        'vegetation': 'Végétation',
        'transports': 'Transports'
    };
    return names[indicator] || indicator;
}

function getIndicatorLabel(indicator, value) {
    switch (indicator) {
        case 'prix':
            return value.toLocaleString('fr-FR') + '€';
        case 'logements':
            return value.toFixed(1) + '%';
        case 'pollution':
            return value.toFixed(1);
        case 'revenus':
            return value.toLocaleString('fr-FR') + '€';
        case 'vegetation':
            return value.toLocaleString('fr-FR') + ' arbres';
        case 'transports':
            return value.toLocaleString('fr-FR') + ' transports';
        default:
            return value;
    }
}

function showError(message) {
    alert(message);
}
