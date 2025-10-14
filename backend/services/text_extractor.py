# services/text_extractor.py - COMPLETE FIXED VERSION
import fitz  # PyMuPDF
from PIL import Image
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Try to import pytesseract
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    logger.info("✅ Tesseract OCR is available")
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("⚠️ Tesseract OCR not available")

def preprocess_image_for_ocr(image):
    """Preprocess image for better OCR results"""
    try:
        img_array = np.array(image)
        
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        thresh = cv2.adaptiveThreshold(
            denoised, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        processed_image = Image.fromarray(thresh)
        return processed_image
    except Exception as e:
        logger.warning(f"Image preprocessing failed: {str(e)}, using original")
        return image

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file"""
    logger.info(f"🚀 Starting text extraction for PDF: {pdf_path}")
    text_content = ""

    try:
        # Open PDF and extract text WITHIN the with-block
        with fitz.open(pdf_path) as doc:
            page_count = doc.page_count
            logger.info(f"📄 Processing PDF with {page_count} pages...")

            for i, page in enumerate(doc):
                page_text = page.get_text("text").strip()
                logger.info(f"📄 Page {i+1}: Extracted {len(page_text)} chars")
                text_content += page_text + "\n\n"
        
        # After with-block, doc is closed but text_content is safe
        if not text_content.strip():
            raise ValueError("No text extracted from PDF")
        
        logger.info(f"✅ PDF extraction complete: {len(text_content)} chars")
        return text_content

    except Exception as e:
        logger.error(f"❌ PDF extraction error: {e}", exc_info=True)
        raise

def extract_text_from_image(file_path):
    """Extract text from image file"""
    if not TESSERACT_AVAILABLE:
        return "OCR not available. Please install Tesseract OCR."
    
    try:
        logger.info(f"🖼️ Processing image: {file_path}")
        
        img = Image.open(file_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        logger.info(f"Image size: {img.size}")
        
        # Try multiple OCR approaches
        results = []
        
        try:
            text1 = pytesseract.image_to_string(img, lang='eng', config=r'--oem 3 --psm 6')
            results.append(text1)
            logger.info(f"Direct OCR: {len(text1)} chars")
        except Exception as e:
            logger.error(f"Direct OCR failed: {e}")
        
        try:
            processed_img = preprocess_image_for_ocr(img)
            text2 = pytesseract.image_to_string(processed_img, lang='eng', config=r'--oem 3 --psm 6')
            results.append(text2)
            logger.info(f"Preprocessed OCR: {len(text2)} chars")
        except Exception as e:
            logger.error(f"Preprocessed OCR failed: {e}")
        
        if results:
            text = max(results, key=len)
            logger.info(f"✅ Best OCR result: {len(text)} chars")
            
            if len(text.strip()) < 50:
                return f"Low quality OCR: only {len(text)} chars extracted"
            
            return text.strip()
        else:
            return "OCR failed to extract text"
    
    except Exception as e:
        logger.error(f"❌ Image extraction error: {e}", exc_info=True)
        raise

def extract_text(file_path, file_type):
    """Main extraction function"""
    try:
        logger.info(f"🚀 Starting extraction for {file_type}: {file_path}")
        
        if file_type.lower() == 'pdf':
            text = extract_text_from_pdf(file_path)
        elif file_type.lower() in ['jpg', 'jpeg', 'png']:
            text = extract_text_from_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        if not text or len(text.strip()) < 10:
            logger.warning(f"⚠️ Very little text: {len(text)} chars")
        
        logger.info(f"✅ Extraction complete: {len(text)} chars")
        return text
    
    except Exception as e:
        logger.error(f"❌ Extraction failed: {e}", exc_info=True)
        raise

def test_ocr_availability():
    """Test OCR configuration"""
    if not TESSERACT_AVAILABLE:
        return False, "Pytesseract not installed"
    
    try:
        test_img = Image.new('RGB', (200, 50), color='white')
        pytesseract.image_to_string(test_img)
        return True, "OCR working"
    except Exception as e:
        return False, f"OCR test failed: {e}"