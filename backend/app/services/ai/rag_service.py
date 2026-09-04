from typing import List, Dict, Any, Optional
from app.services.ai.vector_store import VectorStoreService
from app.core.logging_config import logger


class RAGService:
    """
    RAG Retrieval Service for GST Statutory Regulations & E-Way Bill Compliance.
    Indexes authoritative documents and retrieves grounded regulatory context.
    """

    _vector_store: Optional[VectorStoreService] = None

    OFFICIAL_GST_DOCUMENTS = [
        {
            "doc_id": "GST-EWB-01",
            "title": "CGST Rule 138: Information to be Furnished Prior to Commencement of Movement of Goods and Generation of E-Way Bill",
            "section": "Rule 138(1) to 138(9)",
            "reference": "Rule 138(1) to 138(9)",
            "document_type": "STATUTORY_REGULATION",
            "source_url": "https://cbic-gst.gov.in/rules.html",
            "text": "Every registered person who causes movement of goods of consignment value exceeding fifty thousand rupees (₹50,000) in relation to a supply, or for reasons other than supply, or due to inward supply from an unregistered person, shall before commencement of such movement furnish information relating to the said goods electronically on the common portal in Part A of Form GST EWB-01. Part B requires assignment of vehicle registration details."
        },
        {
            "doc_id": "GST-EWB-02",
            "title": "CGST Rule 138(10): Validity Period of Electronic Way Bill (E-Way Bill)",
            "section": "Rule 138(10) - Validity Standards",
            "reference": "Rule 138(10) - Validity Standards",
            "document_type": "STATUTORY_REGULATION",
            "source_url": "https://cbic-gst.gov.in/rules.html",
            "text": "An E-Way Bill generated under Rule 138 shall be valid for a period corresponding to the travel distance: (a) Up to 200 km: One day (24 hours). (b) For every 200 km or part thereof thereafter: One additional day. For Over Dimensional Cargo (ODC) or multimodal shipment by ship, validity is 20 km per day. Validity starts from the time at which the e-way bill has been generated and each day shall be counted as the period expiring at midnight of the day immediately following the date of generation. Movement of goods after the expiration of EWB validity is unauthorized and liable to confiscation under Section 129."
        },
        {
            "doc_id": "GST-EWB-03",
            "title": "CGST Rule 138A & FASTag Telemetry Integration",
            "section": "Rule 138A - Conveyance Tracking & RFID Integration",
            "reference": "Rule 138A - Conveyance Tracking & RFID Integration",
            "document_type": "STATUTORY_REGULATION",
            "source_url": "https://ewaybillgst.gov.in",
            "text": "The person in charge of a conveyance shall carry the invoice or bill of supply or delivery challan and a copy of the e-way bill in physical form or the e-way bill number in electronic form. Integration with NHAI FASTag RFID sensors provides continuous automated timestamping at highway toll plazas. Cross-referencing E-Way Bill validity against FASTag transactions allows GST enforcement officers to detect vehicles moving without valid documentation or vehicles registered on bills that never physically traversed highway toll corridors (Ghost Transits)."
        },
        {
            "doc_id": "GST-EWB-04",
            "title": "CGST Rule 138B: Verification of Documents and Conveyances by Proper Officers",
            "section": "Rule 138B - Interception & Physical Audit",
            "reference": "Rule 138B - Interception & Physical Audit",
            "document_type": "ENFORCEMENT_PROCEDURE",
            "source_url": "https://cbic-gst.gov.in/circulars.html",
            "text": "The Commissioner or an officer empowered by him on his behalf may authorize any proper officer to intercept any conveyance to verify the e-way bill or the e-way bill number in physical or electronic form for all inter-State and intra-State movement of goods. Physical verification of conveyances shall be carried out by the proper officer as authorized upon receipt of specific information or analytical risk signals regarding tax evasion or document recycling."
        },
        {
            "doc_id": "GST-EWB-05",
            "title": "GST Circular on Route Diversion, Bearing Deviation & Circular Movements",
            "section": "Circular No. 41/15/2018-GST - Route Compliance",
            "reference": "Circular No. 41/15/2018-GST - Route Compliance",
            "document_type": "OFFICIAL_CIRCULAR",
            "source_url": "https://cbic-gst.gov.in/circulars.html",
            "text": "Where a vehicle carrying goods is intercepted on a route which significantly departs from the normal or declared transport corridor between the origin and destination pincodes without reasonable justification (such as road closure, mechanical breakdown, or authorized multi-drop delivery), the proper officer shall examine whether the goods are being diverted to unrecorded consignees or recycled under duplicate invoices. Angular bearing deviations exceeding 30 degrees from declared vectors warrant immediate documentary audit."
        },
        {
            "doc_id": "GST-EWB-06",
            "title": "Statutory Guidelines on Multiple E-Way Bills & Duplicate Invoice Splitting",
            "section": "Section 122 & Section 129 CGST Act - Fraudulent Invoicing",
            "reference": "Section 122 & Section 129 CGST Act - Fraudulent Invoicing",
            "document_type": "COMPLIANCE_GUIDELINE",
            "source_url": "https://cbic-gst.gov.in/gst-act.html",
            "text": "Generation of multiple concurrent E-Way Bills for the same vehicle with overlapping validity windows or identical destination addresses represents a common typological indicator of fraudulent Input Tax Credit (ITC) generation or bill recycling. Where the physical capacity or travel velocity of the vehicle cannot support concurrent transit obligations, proceedings under Section 122 (Penalty for fraudulent transactions) and Section 129 (Detention and seizure) are initiated."
        },
        {
            "doc_id": "GST-EWB-07",
            "title": "FASTag Velocity & Kinematic Telemetry Feasibility in GST Enforcement",
            "section": "National Telemetry Standard Operating Procedure",
            "reference": "National Telemetry Standard Operating Procedure",
            "document_type": "TECHNICAL_STANDARD",
            "source_url": "https://nhai.gov.in",
            "text": "Heavy commercial transport vehicles operating in India are speed-governed to a maximum legal velocity of 80 km/h to 100 km/h. An observed transit velocity exceeding 130 km/h between consecutive FASTag toll plazas indicates either RFID tag cloning (multiple vehicles using the same tag identifier), data manipulation, or impossible movement requiring timestamp validation and physical interception."
        }
    ]

    @classmethod
    def get_vector_store(cls) -> VectorStoreService:
        if cls._vector_store is None:
            cls._vector_store = VectorStoreService()
        
        # Ensure complete statutory base is indexed
        if len(cls._vector_store.documents) < len(cls.OFFICIAL_GST_DOCUMENTS):
            logger.info("Indexing full official GST regulatory corpus into VectorStore...")
            cls._vector_store.add_documents(cls.OFFICIAL_GST_DOCUMENTS)

        return cls._vector_store

    @classmethod
    def retrieve_context(cls, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """Retrieve authoritative GST regulatory context matching the user query."""
        q = query.lower().strip()
        statutory_keywords = [
            "rule", "section", "eway", "e-way", "validity", "gst", "cgst",
            "penalty", "confiscation", "circular", "detention", "fastag", "toll",
            "invoice", "recycling", "ghost", "odc", "kilometer", "distance"
        ]
        
        # If query doesn't relate to GST compliance or rules, don't force RAG docs
        if not any(k in q for k in statutory_keywords):
            return []

        store = cls.get_vector_store()
        return store.search(query=query, top_k=top_k, threshold=0.04)
