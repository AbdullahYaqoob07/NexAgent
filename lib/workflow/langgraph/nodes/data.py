"""
Data Node Executors
"""
import json
import csv
import io
import xml.etree.ElementTree as ET
from typing import Any, Dict, List
from datetime import datetime
import logging
from ..nodes.base import BaseNodeExecutor

logger = logging.getLogger(__name__)


class JsonParseExecutor(BaseNodeExecutor):
    """
    JSON Parse Node - Parses JSON strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["jsonString"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        json_string = config.get("jsonString", "")
        if json_string:
            try:
                json.loads(json_string)
            except json.JSONDecodeError as e:
                errors.append(f"Invalid JSON: {str(e)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse JSON string.
        """
        config = self.config.config
        json_string = config.get("jsonString", "")
        
        # If jsonString is not provided, try to get it from input_data
        if not json_string and isinstance(input_data, str):
            json_string = input_data
        
        try:
            parsed = json.loads(json_string)
            return {
                "success": True,
                "parsed": parsed,
                "parsed_at": datetime.utcnow().isoformat()
            }
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {str(e)}")


class XmlParseExecutor(BaseNodeExecutor):
    """
    XML Parse Node - Parses XML strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["xmlString"]
    
    def _validate_custom_config(self) -> List[str]:
        errors = []
        config = self.config.config
        
        xml_string = config.get("xmlString", "")
        if xml_string:
            try:
                ET.fromstring(xml_string)
            except ET.ParseError as e:
                errors.append(f"Invalid XML: {str(e)}")
        
        return errors
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse XML string.
        """
        config = self.config.config
        xml_string = config.get("xmlString", "")
        
        if not xml_string and isinstance(input_data, str):
            xml_string = input_data
        
        try:
            root = ET.fromstring(xml_string)
            
            # Convert to dict
            def xml_to_dict(element):
                result = {}
                if element.text and element.text.strip():
                    result["_text"] = element.text.strip()
                result.update(element.attrib)
                for child in element:
                    child_data = xml_to_dict(child)
                    if child.tag in result:
                        if not isinstance(result[child.tag], list):
                            result[child.tag] = [result[child.tag]]
                        result[child.tag].append(child_data)
                    else:
                        result[child.tag] = child_data
                return result
            
            parsed = xml_to_dict(root)
            
            return {
                "success": True,
                "parsed": parsed,
                "root_tag": root.tag,
                "parsed_at": datetime.utcnow().isoformat()
            }
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse XML: {str(e)}")


class CsvParseExecutor(BaseNodeExecutor):
    """
    CSV Parse Node - Parses CSV strings
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["csvString"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Parse CSV string.
        """
        config = self.config.config
        csv_string = config.get("csvString", "")
        delimiter = config.get("delimiter", ",")
        has_header = config.get("hasHeader", True)
        
        if not csv_string and isinstance(input_data, str):
            csv_string = input_data
        
        try:
            reader = csv.DictReader(io.StringIO(csv_string), delimiter=delimiter) if has_header else csv.reader(io.StringIO(csv_string), delimiter=delimiter)
            
            if has_header:
                rows = list(reader)
            else:
                rows = [{"column_" + str(i): val for i, val in enumerate(row)} for row in reader]
            
            return {
                "success": True,
                "rows": rows,
                "row_count": len(rows),
                "parsed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")


class DataFilterExecutor(BaseNodeExecutor):
    """
    Data Filter Node - Filters data based on conditions
    """
    
    def get_required_config_fields(self) -> List[str]:
        return ["filter"]
    
    async def _execute_impl(self, input_data: Any) -> Any:
        """
        Filter data.
        """
        config = self.config.config
        filter_config = config.get("filter", {})
        
        # Apply filter
        if isinstance(input_data, list):
            filtered = []
            for item in input_data:
                if self._matches_filter(item, filter_config):
                    filtered.append(item)
            return {
                "original_count": len(input_data),
                "filtered_count": len(filtered),
                "filtered": filtered,
                "filtered_at": datetime.utcnow().isoformat()
            }
        else:
            # Single item
            if self._matches_filter(input_data, filter_config):
                return {
                    "original": input_data,
                    "filtered": input_data,
                    "matched": True,
                    "filtered_at": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "original": input_data,
                    "filtered": None,
                    "matched": False,
                    "filtered_at": datetime.utcnow().isoformat()
                }
    
    def _matches_filter(self, item: Any, filter_config: Dict) -> bool:
        """
        Check if item matches filter conditions.
        """
        if not filter_config:
            return True
        
        # Simple filter matching
        for key, value in filter_config.items():
            if isinstance(item, dict):
                if key not in item or item[key] != value:
                    return False
            else:
                return False
        
        return True

