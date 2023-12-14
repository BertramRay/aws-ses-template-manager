const parseContent = (content) => {
  console.log(content);
  if (!content) return "";
  // Parse unicode escaped characters
  let retVal = content.replace(/"/g, '\\"').replace(/(?:\r\n|\r|\n)/g, '\\n');
  retVal = retVal.replace(/\\u([\d\w]{4})/gi, function (match, grp) {
    return String.fromCharCode(parseInt(grp, 16));
  });
  retVal = retVal.replace(/\\n/g, '\n');
  retVal = retVal.replace(/\\t/g, '\t');
  retVal = retVal.replace(/\\r/g, '\r');
  retVal = retVal.replace(/\\b/g, '\b');
  retVal = retVal.replace(/\\f/g, '\f');
  retVal = retVal.replace(/\\'/g, '\'');
  retVal = retVal.replace(/\\"/g, '\"');
  retVal = retVal.replace(/\\\\/g, '\\');
  return retVal;
};

$(document).ready(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const templateName = urlParams.get('name');
  let cmInitialized = false;

  if (!templateName) {
    window.location.href = '/'; //something went wrong
  }

  window.codeMirrorEditor = window.CodeMirror.fromTextArea(document.querySelector('#codeMirror'), {
    mode: "htmlmixed",
    lineNumbers: true,
    viewportMargin: Infinity
  });

  const setTemplatePreview = () => {
    const templateHtml = window.codeMirrorEditor.getValue();
    $('#templatePreview').html(templateHtml);
  };  

  $.get(`/get-template/${templateName}?region=${localStorage.getItem('region')}`, function (response) {
    $('#templateName').val(response.data.TemplateName);
    const subjectParsed = parseContent(response.data.SubjectPart);
    $('#templateSubject').val(subjectParsed);
    const textParsed = parseContent(response.data.TextPart);
    $('#templateText').val(textParsed);

    const htmlParsed = parseContent(response.data.HtmlPart);
    window.codeMirrorEditor.setValue(htmlParsed ? htmlParsed : "");
    cmInitialized = true;

    $('#updateTemplateForm').removeClass('d-none'); //show the form only when we have pre-populated all inputs
    window.codeMirrorEditor.refresh();  //must be called to re draw the code editor
    setTemplatePreview();
  });

  $('#alwaysFullyRenderCodeEditor').on('change', (e) => {
    const newValue = e.target.checked;
    const newViewportMargin = newValue ? Infinity : window.CodeMirror.defaults.viewportMargin;
    window.codeMirrorEditor.setOption('viewportMargin', newViewportMargin);
  });

  const isCodeMirrorEvent = (e) => (e.target === window.codeMirrorEditor.getInputField());

  $('#updateTemplateForm').on('input', (e) => {
    if (isCodeMirrorEvent(e)) return;
    const isEditorConfig = e.target.getAttribute('data-editor-config') === 'true';
    if (isEditorConfig) return;
    $('#updateTemplateForm button').attr('disabled', false);
  });

  // We may not get an input event on deletion from the codeMirror editor
  window.codeMirrorEditor.on('change', (cm, change) => {
    if (!cmInitialized) return;
    $('#updateTemplateForm button').attr('disabled', false)
  });

  const handlePreview = () => {
    const showPreview = $('#templatePreviewContainer')[0].checkVisibility();
    if (!showPreview) return;
    setTemplatePreview();
  };

  $('#updateTemplateForm').on('input', (e) => {
    if (isCodeMirrorEvent(e)) return;
    handlePreview();
  });

  // We may not get an input event on deletion from the codeMirror editor
  window.codeMirrorEditor.on('change', handlePreview);

  $('#showPreview').on('change', (e) => {
    const newValue = e.target.checked;
    const changeVisibility = newValue ? 'show' : 'hide';
    $('#templatePreviewContainer')[changeVisibility]();
    if (newValue) return setTemplatePreview();
    $('#templatePreview').html('');
  });

  $('#updateTemplateForm').submit(function (e) {
    e.preventDefault();
    const putPayload = {
      "TemplateName": $('#templateName').val(),
      "HtmlPart": window.codeMirrorEditor.getValue(),
      "SubjectPart": $('#templateSubject').val(),
      "TextPart": $('#templateText').val(),
      "region": localStorage.getItem('region')
    };

    $.ajax({
      url: `/update-template`,
      type: 'PUT',
      data: putPayload,
      success: function () {
        window.location.href = '/';
      },
      error: function (xhr) {
        let content;
        if (xhr.responseJSON.message) {
          content = xhr.responseJSON.message;
        } else {
          content = "Error updating template. Please try again";
        }
        $('#errContainer').html(content).removeClass('d-none');
      }
    });
  });

});

