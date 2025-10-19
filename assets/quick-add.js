if (!customElements.get('quick-add-modal')) {
  customElements.define('quick-add-modal', class QuickAddModal extends ModalDialog {
    constructor() {
      super();
      this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

      this.addEventListener('product-info:loaded', ({ target }) => {
        target.addPreProcessCallback(this.preprocessHTML.bind(this));
      });
    }

    hide(preventFocus = false) {
      const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
      if (cartNotification) cartNotification.setActiveElement(this.openedBy);
      this.modalContent.innerHTML = '';

      if (preventFocus) this.openedBy = null;
      super.hide();
    }

    show(opener) {
      opener.setAttribute('aria-disabled', true);
      opener.classList.add('loading');
      opener.querySelector('.loading-overlay__spinner').classList.remove('hidden');
      fetch(opener.getAttribute('data-product-url'))
        .then((response) => response.text())
        .then((responseText) => {
          const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
          const productElement = responseHTML.querySelector('product-info[id^="MainProduct-"]');

          this.preprocessHTML(productElement);
          HTMLUpdateUtility.setInnerHTML(this.modalContent, productElement.outerHTML);

          //this.productElement = responseHTML.querySelector('section[id^="MainProduct-"]');
          //this.preventDuplicatedIDs();
          //this.removeDOMElements();
          //this.setInnerHTML(this.modalContent, this.productElement.innerHTML);

          if (window.Shopify && Shopify.PaymentButton) {
            Shopify.PaymentButton.init();
          }

          if (window.ProductModel) window.ProductModel.loadShopifyXR();

          //this.removeGalleryListSemantic();
          //this.updateImageSizes();
          //this.preventVariantURLSwitching();
          super.show(opener);
        })
        .finally(() => {
          opener.removeAttribute('aria-disabled');
          opener.classList.remove('loading');
          opener.querySelector('.loading-overlay__spinner').classList.add('hidden');
        });
    }

    /*setInnerHTML(element, html) {
      element.innerHTML = html;

      // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
      element.querySelectorAll('script').forEach(oldScriptTag => {
        const newScriptTag = document.createElement('script');
        Array.from(oldScriptTag.attributes).forEach(attribute => {
          newScriptTag.setAttribute(attribute.name, attribute.value)
        });
        newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
        oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
      });
    }*/

    preprocessHTML(productElement) {
      productElement.classList.forEach((classApplied) => {
        if (classApplied.startsWith('color-') || classApplied === 'gradient')
          this.modalContent.classList.add(classApplied);
      });
      this.preventDuplicatedIDs(productElement);
      this.removeDOMElements(productElement);
      this.removeGalleryListSemantic(productElement);
      this.updateImageSizes(productElement);
      this.preventVariantURLSwitching(productElement);
    }

    preventVariantURLSwitching(productElement) {
      /*const variantPicker = this.modalContent.querySelector('variant-radios,variant-selects');
      if (!variantPicker) return;

      variantPicker.setAttribute('data-update-url', 'false');*/
      productElement.setAttribute('data-update-url', 'false');
    }

    removeDOMElements(productElement) {
      const pickupAvailability = productElement.querySelector('pickup-availability');
      if (pickupAvailability) pickupAvailability.remove();

      const productModal = productElement.querySelector('product-modal');
      if (productModal) productModal.remove();

      const modalDialog = productElement.querySelectorAll('modal-dialog');
      if (modalDialog) modalDialog.forEach(modal => modal.remove());
    }

    preventDuplicatedIDs(productElement) {
      const sectionId = productElement.dataset.section;
      
      const oldId = sectionId;
      const newId = `quickadd-${sectionId}`;
      productElement.innerHTML = productElement.innerHTML.replaceAll(oldId, newId);
      Array.from(productElement.attributes).forEach((attribute) => {
        if (attribute.value.includes(oldId)) {
          productElement.setAttribute(attribute.name, attribute.value.replace(oldId, newId));
        }
      });

      productElement.dataset.originalSection = sectionId;

      /*this.productElement.innerHTML = this.productElement.innerHTML.replaceAll(sectionId, `quickadd-${ sectionId }`);
      this.productElement.querySelectorAll('variant-selects, variant-radios, product-info').forEach((element) => {
        element.dataset.originalSection = sectionId;
      });*/
    }

    removeGalleryListSemantic(productElement) {
      const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
      if (!galleryList) return;

      galleryList.setAttribute('role', 'presentation');
      galleryList.querySelectorAll('[id^="Slide-"]').forEach(li => li.setAttribute('role', 'presentation'));
    }

    updateImageSizes(productElement) {
      const product = productElement.querySelector('.product');
      const desktopColumns = product?.classList.contains('product--columns');
      if (!desktopColumns) return;

      const mediaImages = product.querySelectorAll('.product__media img');
      if (!mediaImages.length) return;

      let mediaImageSizes = '(min-width: 1000px) 715px, (min-width: 768px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';
      
      if (product.classList.contains('product--medium')) {
        mediaImageSizes = mediaImageSizes.replace('715px', '605px');
      } else if (product.classList.contains('product--small')) {
        mediaImageSizes = mediaImageSizes.replace('715px', '495px');
      }

      mediaImages.forEach(img => img.setAttribute('sizes', mediaImageSizes));
    }
  });
}
