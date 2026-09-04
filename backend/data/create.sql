CREATE database gst_project;
USE gst_project;
CREATE TABLE eway_bills (
    ewb_no BIGINT PRIMARY KEY,
    ewb_dt DATETIME NOT NULL,
    from_pin INT NOT NULL,
    to_pin INT NOT NULL,
    travel_distance INT NOT NULL,
    ewb_final_valid_dt DATETIME NOT NULL,
    ewb_ass_amt DECIMAL(15,2),
    cgst_amt DECIMAL(15,2),
    sgst_amt DECIMAL(15,2),
    igst_amt DECIMAL(15,2),
    vehicle_number VARCHAR(20),

    INDEX idx_vehicle(vehicle_number)
);

CREATE TABLE fastag_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    toll_id BIGINT,
    toll_name VARCHAR(255),
    highway_type VARCHAR(20),
    geo_lat DECIMAL(10,6),
    geo_long DECIMAL(10,6),
    updated_at_npci DATETIME,
    status CHAR(1),
    toll BIGINT,
    readertme DATETIME,
    veh VARCHAR(20),
    INDEX idx_vehicle(veh)
);
CREATE TABLE pincode_locations (
    pin_code BIGINT PRIMARY KEY,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    office_name VARCHAR(255),
    district VARCHAR(150),
    state VARCHAR(150),
    region VARCHAR(150),
    circle VARCHAR(150),
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);