let currentStep = 1;
const totalSteps = document.querySelectorAll('.ct_form_step').length;
const nextBtn = document.getElementById('nextBtn');
const btnText = document.getElementById('btnText');

nextBtn.addEventListener('click', () => {
      if (currentStep < totalSteps) {
            document.querySelector(`.ct_form_step[data-step="${currentStep}"]`)
                  .classList.remove('active');

            currentStep++;

            document.querySelector(`.ct_form_step[data-step="${currentStep}"]`)
                  .classList.add('active');

            updateStepper();
      } else {
            alert('Form Submitted 🚀');
      }
});

function updateStepper() {
      document.querySelectorAll('.ct_step_circle').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === currentStep);
      });

      btnText.innerText = currentStep === totalSteps ? 'Submit' : 'Next';
}
