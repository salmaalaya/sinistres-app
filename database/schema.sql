-- =========================================================
-- Base de données : gestion et analyse des sinistres BIAT
-- Etape 1 : Modelisation des donnees (MCD/MLD)
-- =========================================================

CREATE DATABASE IF NOT EXISTS sinistres_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sinistres_db;

-- ---------------------------------------------------------
-- Table UTILISATEURS
-- Comptes applicatifs (Administrateur / Gestionnaire)
-- ---------------------------------------------------------
CREATE TABLE utilisateurs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,           -- hash BCrypt
    nom             VARCHAR(100) NOT NULL,
    prenom          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    role            ENUM('ADMIN', 'GESTIONNAIRE') NOT NULL DEFAULT 'GESTIONNAIRE',
    actif           BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Table SINISTRES
-- Un enregistrement = un dossier sinistre (dedupliqué depuis
-- le fichier source, ou CODE_SINISTRE se repete pour chaque
-- reglement)
-- ---------------------------------------------------------
CREATE TABLE sinistres (
    id                              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code_sinistre                   BIGINT       NOT NULL UNIQUE,
    n_sinistre                      VARCHAR(20)  NOT NULL,
    date_sinistre                   DATE         NOT NULL,
    date_ouverture                  DATE         NOT NULL,
    date_cloture_sinistre           DATE         NULL,
    nature_sin                      VARCHAR(5)   NOT NULL,   -- F, D, R
    type_sin                        VARCHAR(5)   NOT NULL,   -- M, C
    date_retour_quittance_signe     DATE         NULL,
    date_ordonnancement             DATE         NOT NULL,
    processus                       VARCHAR(50)  NOT NULL DEFAULT 'Processus Standard',
    gestionnaire_id                 BIGINT       NULL,
    date_creation                   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_modification               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sinistre_gestionnaire
        FOREIGN KEY (gestionnaire_id) REFERENCES utilisateurs(id)
        ON DELETE SET NULL,
    INDEX idx_nature (nature_sin),
    INDEX idx_type (type_sin),
    INDEX idx_processus (processus),
    INDEX idx_date_ouverture (date_ouverture),
    INDEX idx_date_cloture (date_cloture_sinistre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Table REGLEMENTS
-- Un sinistre peut avoir plusieurs reglements (paiements)
-- Montants stockes en valeur absolue (positive) ; le fichier
-- source les donne en negatif (convention comptable sortie
-- de tresorerie), le signe est purement une info de sens de
-- flux et n'a pas de valeur analytique ici.
-- ---------------------------------------------------------
CREATE TABLE reglements (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    sinistre_id         BIGINT NOT NULL,
    montant_reglement   DECIMAL(15,3) NOT NULL,
    date_reglement      DATE NOT NULL,
    date_creation       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reglement_sinistre
        FOREIGN KEY (sinistre_id) REFERENCES sinistres(id)
        ON DELETE CASCADE,
    INDEX idx_date_reglement (date_reglement)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Utilisateur admin par defaut
-- mot de passe : Admin@123  (a changer, hash genere par le
-- backend au premier lancement - voir etape 3 Auth)
-- ---------------------------------------------------------
-- INSERT INTO utilisateurs (username, password, nom, prenom, email, role)
-- VALUES ('admin', '<hash_bcrypt>', 'Admin', 'BIAT', 'admin@biat.tn', 'ADMIN');
