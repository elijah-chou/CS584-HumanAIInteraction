// file for the quill editor configuration
var quill = new Quill('#editor', {
    modules: {
      toolbar: '#toolbar'
    },
    placeholder: 'Write anything on your mind...',
    theme: 'snow'
  });