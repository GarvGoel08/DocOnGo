import React from 'react';

const PrescriptionModal = ({ isOpen, onClose, prescription }) => {
  if (!isOpen || !prescription) return null;

  const generatePrescriptionHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Prescription - DocOnGo AI</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
              color: #374151;
            }
            .prescription-header {
              border-bottom: 2px solid #3B82F6;
              padding-bottom: 20px;
              margin-bottom: 20px;
              text-align: center;
            }
            .prescription-title {
              font-size: 24px;
              font-weight: bold;
              color: #1F2937;
              margin-bottom: 10px;
            }
            .doctor-info {
              font-size: 18px;
              color: #6B7280;
            }
            .section {
              margin-bottom: 25px;
              padding: 15px;
              border-left: 4px solid #3B82F6;
              background-color: #F9FAFB;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 10px;
              color: #1F2937;
            }
            .medicine-item {
              background: white;
              padding: 15px;
              margin-bottom: 10px;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
            }
            .medicine-name {
              font-weight: 600;
              font-size: 16px;
              color: #1F2937;
            }
            .medicine-details {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
              margin-top: 10px;
            }
            .detail-item {
              font-size: 14px;
            }
            .detail-label {
              font-weight: 500;
              color: #6B7280;
            }
            .detail-value {
              color: #374151;
            }
            .disclaimer {
              background-color: #FEF3C7;
              border: 1px solid #F59E0B;
              padding: 15px;
              border-radius: 8px;
              margin-top: 20px;
            }
            .disclaimer-title {
              font-weight: 600;
              color: #92400E;
              margin-bottom: 8px;
            }
            .disclaimer-text {
              font-size: 12px;
              color: #92400E;
            }
            .signature-section {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #E5E7EB;
              display: flex;
              justify-content: space-between;
              align-items: end;
            }
            .signature-box {
              width: 150px;
              height: 60px;
              border: 2px dashed #9CA3AF;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #6B7280;
              font-size: 12px;
            }
            ul {
              list-style-type: disc;
              padding-left: 20px;
            }
            li {
              margin-bottom: 5px;
            }
            @media print {
              @page {
                margin: 0;
                size: A4;
              }
              body { 
                margin: 0; 
                padding: 15px; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              .section { break-inside: avoid; }
              .medicine-item { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="prescription-header">
            <div class="prescription-title">🩺 AI Generated Prescription</div>
            <div class="doctor-info">Dr. AI - Digital Medical Assistant</div>
            <div style="font-size: 14px; color: #6B7280; margin-top: 10px;">
              Date: ${new Date().toLocaleDateString('en-IN')} | Time: ${new Date().toLocaleTimeString('en-IN')}
            </div>
          </div>
          
          ${prescription.description_of_issue ? `
            <div class="section">
              <div class="section-title">Chief Complaint</div>
              <p>${prescription.description_of_issue}</p>
            </div>
          ` : ''}
          
          ${prescription.ai_analysis ? `
            <div class="section">
              <div class="section-title">Clinical Assessment & Analysis</div>
              <p>${prescription.ai_analysis}</p>
            </div>
          ` : ''}
          
          ${prescription.medicines && prescription.medicines.length > 0 ? `
            <div class="section">
              <div class="section-title">Prescribed Medications</div>
              ${prescription.medicines.map(medicine => `
                <div class="medicine-item">
                  <div class="medicine-name">${medicine.name}</div>
                  <div class="medicine-details">
                    <div class="detail-item">
                      <div class="detail-label">Dosage:</div>
                      <div class="detail-value">${medicine.dosage}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Duration:</div>
                      <div class="detail-value">${medicine.duration}</div>
                    </div>
                    <div class="detail-item">
                      <div class="detail-label">Composition:</div>
                      <div class="detail-value">${medicine.composition || 'Generic Medicine'}</div>
                    </div>
                  </div>
                  ${medicine.instructions ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E5E7EB;">
                      <div class="detail-label">Instructions:</div>
                      <div class="detail-value">${medicine.instructions}</div>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${prescription.general_tips && prescription.general_tips.length > 0 ? `
            <div class="section">
              <div class="section-title">General Recommendations</div>
              <ul>
                ${prescription.general_tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${prescription.dietary_advice && prescription.dietary_advice.length > 0 ? `
            <div class="section">
              <div class="section-title">Dietary Recommendations</div>
              <ul>
                ${prescription.dietary_advice.map(advice => `<li>${advice}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${prescription.follow_up_instructions ? `
            <div class="section">
              <div class="section-title">Follow-up Instructions</div>
              <p>${prescription.follow_up_instructions}</p>
            </div>
          ` : ''}
          
          <div class="disclaimer">
            <div class="disclaimer-title">Important Disclaimer</div>
            <div class="disclaimer-text">
              • This is an AI-generated prescription for informational purposes only.<br>
              • Always consult with a qualified healthcare professional before taking any medication.<br>
              • This does not replace professional medical advice, diagnosis, or treatment.<br>
              • In case of emergency, contact your local emergency services immediately.
            </div>
          </div>
          
          <div class="signature-section">
            <div>
              <div style="font-weight: 500;">Generated by DocOnGo AI</div>
              <div style="font-size: 12px; color: #6B7280;">Digital Medical Assistant Platform</div>
            </div>
            <div style="text-align: center;">
              <div class="signature-box">AI Generated</div>
              <div style="margin-top: 5px; font-weight: 500;">Dr. AI</div>
              <div style="font-size: 12px; color: #6B7280;">AI Medical Assistant</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    // Create a new window for printing with the same HTML as download
    const printWindow = window.open('', '_blank');
    const htmlContent = generatePrescriptionHTML();
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = async () => {
    try {
      // Create a new window for PDF generation
      const pdfWindow = window.open('', '_blank');
      const htmlContent = generatePrescriptionHTML();
      
      pdfWindow.document.write(htmlContent);
      pdfWindow.document.close();
      pdfWindow.focus();
      
      // Wait for content to load, then trigger print dialog for saving as PDF
      setTimeout(() => {
        // Show print dialog which allows saving as PDF
        pdfWindow.print();
        
        // Close the window after a delay to allow user to save
        setTimeout(() => {
          pdfWindow.close();
        }, 1000);
      }, 250);
      
    } catch (error) {
      console.error('Error downloading prescription:', error);
      alert('Error downloading prescription. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="prescription-modal bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">💊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Generated Prescription</h2>
              <p className="text-blue-100 text-sm">Digital Medical Consultation Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Prescription Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-170px)] p-6 prescription-content">
          {/* Doctor Header */}
          <div className="border-b-2 border-blue-100 pb-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                  <span className="mr-3">🩺</span>
                  Dr. AI - Digital Medical Assistant
                </h3>
                <p className="text-gray-600 mt-1">Powered by AI</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                <p>Time: {new Date().toLocaleTimeString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Chief Complaint */}
          {prescription.description_of_issue && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Chief Complaint
              </h4>
              <div className="bg-red-50 rounded-xl p-4 border-l-4 border-red-400">
                <p className="text-gray-700 leading-relaxed">{prescription.description_of_issue}</p>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {prescription.ai_analysis && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Clinical Assessment & Analysis
              </h4>
              <div className="bg-purple-50 rounded-xl p-4 border-l-4 border-purple-400">
                <p className="text-gray-700 leading-relaxed">{prescription.ai_analysis}</p>
              </div>
            </div>
          )}

          {/* Prescription Medicines */}
          {prescription.medicines && prescription.medicines.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Prescribed Medications
              </h4>
              <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-400">
                <div className="space-y-4">
                  {prescription.medicines.map((medicine, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h5 className="font-semibold text-gray-800 mb-1">{medicine.name}</h5>
                          <p className="text-sm text-gray-600">{medicine.composition || 'Generic Medicine'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Dosage:</p>
                          <p className="text-sm text-gray-600">{medicine.dosage}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Duration:</p>
                          <p className="text-sm text-gray-600">{medicine.duration}</p>
                        </div>
                      </div>
                      {medicine.instructions && (
                        <div className="mt-3 pt-3 border-t border-green-100">
                          <p className="text-sm font-medium text-gray-700">Instructions:</p>
                          <p className="text-sm text-gray-600 mt-1">{medicine.instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* General Tips */}
          {prescription.general_tips && prescription.general_tips.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                General Recommendations
              </h4>
              <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-400">
                <ul className="space-y-2">
                  {prescription.general_tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2 mt-1">•</span>
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Dietary Advice */}
          {prescription.dietary_advice && prescription.dietary_advice.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 3H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                Dietary Recommendations
              </h4>
              <div className="bg-orange-50 rounded-xl p-4 border-l-4 border-orange-400">
                <ul className="space-y-2">
                  {prescription.dietary_advice.map((advice, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-600 mr-2 mt-1">•</span>
                      <span className="text-gray-700">{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Follow-up Instructions */}
          {prescription.follow_up_instructions && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Follow-up Instructions
              </h4>
              <div className="bg-indigo-50 rounded-xl p-4 border-l-4 border-indigo-400">
                <p className="text-gray-700 leading-relaxed">{prescription.follow_up_instructions}</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-yellow-50 rounded-xl p-4 border-l-4 border-yellow-400 mb-6">
            <h4 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Important Disclaimer
            </h4>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>• This is an AI-generated prescription for informational purposes only.</p>
              <p>• Always consult with a qualified healthcare professional before taking any medication.</p>
              <p>• This does not replace professional medical advice, diagnosis, or treatment.</p>
              <p>• In case of emergency, contact your local emergency services immediately.</p>
              <p>• Keep this prescription for your records and share with your doctor during consultation.</p>
              <p>• All chemists/pharmacies are informed that this is an AI-generated prescription and is not valid for dispensing medication.</p>
            </div>
          </div>

          {/* Digital Signature */}
          <div className="text-right text-sm text-gray-600 border-t-2 border-gray-100 pt-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="font-medium">Generated by DocOnGo AI</p>
                <p>Digital Medical Assistant Platform</p>
                <p>https://docongoai.vercel.app</p>
              </div>
              <div className="text-right">
                <div className="w-40 h-16 border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
                  <span className="text-gray-400">AI Generated</span>
                </div>
                <p className="font-medium">Dr. AI</p>
                <p>AI Medical Assistant</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-4 flex justify-between items-center border-t">
          <div className="text-xs text-gray-500">
            Generated on {new Date().toLocaleString('en-IN')}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDownload}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles - Hide everything except prescription modal when printing */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          
          body * {
            visibility: hidden;
          }
          
          .prescription-modal,
          .prescription-modal * {
            visibility: visible;
          }
          
          .prescription-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
          }
          
          body {
            margin: 0 !important;
            padding: 15px !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .fixed {
            position: static !important;
          }
          
          .bg-black {
            background: none !important;
          }
          
          .max-w-4xl {
            max-width: none !important;
            width: 100% !important;
          }
          
          .max-h-\\[90vh\\] {
            max-height: none !important;
          }
          
          .overflow-hidden {
            overflow: visible !important;
          }
          
          .overflow-y-auto {
            overflow: visible !important;
          }
          
          .shadow-2xl,
          .shadow-xl,
          .shadow-lg,
          .shadow-sm {
            box-shadow: none !important;
          }
          
          .bg-gradient-to-r,
          .bg-gradient-to-br {
            background: #3B82F6 !important;
            color: white !important;
          }
          
          .prescription-content {
            padding: 0 !important;
          }
          
          .rounded-2xl,
          .rounded-xl,
          .rounded-lg {
            border-radius: 8px !important;
          }
          
          .p-6,
          .p-4 {
            padding: 12px !important;
          }
          
          .text-white {
            color: black !important;
          }
          
          .border-l-4 {
            border-left: 4px solid #3B82F6 !important;
          }
          
          .bg-red-50,
          .bg-purple-50,
          .bg-green-50,
          .bg-blue-50,
          .bg-orange-50,
          .bg-indigo-50,
          .bg-yellow-50,
          .bg-gray-50 {
            background: #F9FAFB !important;
          }
          
          .text-blue-600,
          .text-red-600,
          .text-purple-600,
          .text-green-600,
          .text-orange-600,
          .text-indigo-600,
          .text-yellow-800 {
            color: #1F2937 !important;
          }
          
          button {
            display: none !important;
          }
          
          .prescription-modal-header button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionModal;
